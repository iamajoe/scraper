package main

import (
	"fmt"
	"net/url"
	"strings"
	"time"
)

func replaceAtIndex(input string, replacement string, index int) string {
	return input[:index] + replacement + input[index+1:]
}

func mergeUrls(urlA string, urlB string) (string, error) {
	// already having a protocol means we already have a built url
	urlBHasProtocol := strings.Contains(urlB, "http:/") || strings.Contains(urlB, "https:/")
	if urlBHasProtocol {
		return urlB, nil
	}

	// make sure the url has a protocol
	urlAWithProtocol := urlA
	urlAHasProtocol := strings.Contains(urlA, "http:/") || strings.Contains(urlA, "https:/")
	if !urlAHasProtocol {
		urlAWithProtocol = fmt.Sprintf("https://%s", urlAWithProtocol)
	}

	urlAParsed, err := url.Parse(urlAWithProtocol)
	if err != nil {
		return "", err
	}

	// remove the first characters if path based, we don't need them
	urlBParsed := urlB
	if string(urlBParsed[0]) == "." && string(urlBParsed[1]) == "/" {
		urlBParsed = replaceAtIndex(urlBParsed, "", 0)
	}

	if string(urlBParsed[0]) == "/" {
		urlBParsed = replaceAtIndex(urlBParsed, "", 0)
	}

	newUrl := fmt.Sprintf("%s://%s/%s", urlAParsed.Scheme, urlAParsed.Hostname(), urlBParsed)
	return newUrl, nil
}

type Crawl struct {
	id                 string        // an unique identifier for the job
	fetch              *Fetch        // structure that will proceed with the scraping
	paginationSelector string        // css selector to retrieve pagination urls
	waitRenderTime     time.Duration // js render waiting time
	dataSelector       string        // css selector to retrieve content
	dataType           string        // is the content under which kind of fetch dataType
	dataOptions        string        // does the dataType has some kind of options?
	result             []string      // where the data will be stored
	urlsToFetch        []string      // urls that still need to be fetched
	urlsFetched        []string      // urls that were already fetched
	urlsToIgnore       []string      // if an url contains one of these, it will be ignored
	running            bool          // is the job running?
}

func (c *Crawl) isAlreadyFetched(url string) bool {
	for _, urlFetched := range c.urlsFetched {
		if url == urlFetched {
			return true
		}
	}

	return false
}

func (c *Crawl) isUrlIgnored(url string) bool {
	for _, urlIgnore := range c.urlsToIgnore {
		if strings.Contains(url, urlIgnore) {
			return true
		}
	}

	return false
}

func (c *Crawl) removeFromToFetch(url string) {
	for i, urlToFetch := range c.urlsToFetch {
		if url == urlToFetch {
			c.urlsToFetch = append(c.urlsToFetch[:i], c.urlsToFetch[i+1:]...)
			return
		}
	}
}

func (c *Crawl) cacheResult(content []string) {
	// lets make sure that the content is unique
	for _, singleContent := range content {
		found := false

		for _, cachedContent := range c.result {
			if singleContent == cachedContent {
				found = true
				break
			}
		}

		if !found {
			c.result = append(c.result, singleContent)
		}
	}
}

func (c *Crawl) fetchPage(
	url string,
) error {
	// no need to go further if url was already fetched or we need to ignore it
	if c.isAlreadyFetched(url) || c.isUrlIgnored(url) {
		c.removeFromToFetch(url)
		return nil
	}

	// fetch the url
	err := c.fetch.GetURL(url, c.waitRenderTime)
	if err != nil {
		return err
	}

	// handles pagination
	if len(c.paginationSelector) > 0 {
		paginationData, err := c.fetch.GetSelectorData(c.paginationSelector, "attr", "href")
		if err != nil {
			return err
		}

		// add the page to the request list
		for _, page := range paginationData {
			newUrl, err := mergeUrls(url, page)
			if err != nil {
				return err
			}
			c.urlsToFetch = append(c.urlsToFetch, newUrl)
		}
	}

	// handle the content
	contentData, err := c.fetch.GetSelectorData(c.dataSelector, c.dataType, c.dataOptions)
	if err != nil {
		return err
	}

	c.cacheResult(contentData)
	c.urlsFetched = append(c.urlsFetched, url)
	c.removeFromToFetch(url)

	return nil
}

func (c *Crawl) Stop() ([]string, error) {
	c.running = false

	err := c.fetch.Close()
	if err != nil {
		return c.result, err
	}

	return c.result, nil
}

func (c *Crawl) Start() ([]string, error) {
	c.running = true

	// TODO: cache system on a file
	// TODO: what to do when finalized?
	// TODO: setup callbacks / goroutine channels to inform of new states

	// while for all urls to fetch, more will be added while running
	// because of the pagination, so we can't use a simple range
	for len(c.urlsToFetch) > 0 && c.running {
		err := c.fetchPage(c.urlsToFetch[0])
		if err != nil {
			return c.result, err
		}
	}

	return c.result, nil
}
