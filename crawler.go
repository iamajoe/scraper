package main

import (
	"time"
)

type Crawl struct {
	fetch              *Fetch        // structure that will proceed with the scraping
	paginationSelector string        // css selector to retrieve pagination urls
	waitRenderTime     time.Duration // js render waiting time
	waitRequestTime    time.Duration // time to wait between requests
	dataSelector       string        // css selector to retrieve content
	dataType           string        // is the content under which kind of fetch dataType
	dataOptions        string        // does the dataType has some kind of options?
	Running            bool          // is the job running?
	Result             []string      // where data will be cached
}

func (c *Crawl) fetchPage(
	url string,
) ([]string, []string, error) {
	// fetch the url
	err := c.fetch.GetURL(url, c.waitRenderTime)
	if err != nil {
		return []string{}, []string{}, err
	}

	// handle the content
	contentData, err := c.fetch.GetSelectorData(c.dataSelector, c.dataType, c.dataOptions)
	if err != nil {
		return []string{}, []string{}, err
	}

	// handles pagination
	pages := []string{}
	if len(c.paginationSelector) > 0 {
		paginationData, err := c.fetch.GetSelectorData(c.paginationSelector, "attr", "href")
		if err != nil {
			return []string{}, []string{}, err
		}

		// add the page to the request list
		for _, page := range paginationData {
			newUrl, err := mergeUrls(url, page)
			if err != nil {
				return []string{}, []string{}, err
			}

			// no need to cache url if already in there or already fetched
			pages = append(pages, newUrl)
		}
	}

	return contentData, pages, nil
}

func (c *Crawl) Stop() error {
	c.Running = false
	return nil
}

func (c *Crawl) Start(
	updateCallback func(
		res []string,
		toFetch []string,
		fetched []string,
		err error,
	),
	urlsToFetch []string,
	urlsFetched []string,
	urlsToIgnore []string,
) ([]string, error) {
	c.Running = true

	parsedUrlsToFetch := append([]string{}, urlsToFetch...)
	parsedUrlsFetched := append([]string{}, urlsFetched...)
	parsedUrlsToIgnore := append([]string{}, urlsToIgnore...)

	// while for all urls to fetch, more will be added while running
	// because of the pagination, so we can't use a simple range
	for len(parsedUrlsToFetch) > 0 && c.Running {
		url := parsedUrlsToFetch[0]
		parsedUrlsToFetch = removeFromArray(url, parsedUrlsToFetch)

		// no need to go further if url was already fetched or we need to ignore it
		if isInArray(url, parsedUrlsFetched) || isContentInArray(url, parsedUrlsToIgnore) {
			continue
		}

		// fetch the page
		content, pages, err := c.fetchPage(url)

		// do we have new pages?
		for _, page := range pages {
			if !isInArray(page, parsedUrlsToFetch) && !isInArray(page, parsedUrlsFetched) {
				parsedUrlsToFetch = addUniqueInArray([]string{page}, parsedUrlsToFetch)
			}
		}

		// add the content
		c.Result = addUniqueInArray(content, c.Result)
		parsedUrlsFetched = addUniqueInArray([]string{url}, parsedUrlsFetched)

		updateCallback(c.Result, parsedUrlsToFetch, parsedUrlsFetched, err)

		time.Sleep(c.waitRequestTime)
	}

	// all done so lets do a final update
	updateCallback(c.Result, parsedUrlsToFetch, parsedUrlsFetched, nil)

	c.Running = false

	return c.Result, nil
}

// TODO: job system should have a list of limited workers
//			 and those workers would be filled with new jobs from a queue as
//			 they finish
//			 use channels to inform the workers of what they should be doing
//			 or
//       limit the workers and open and close as please
