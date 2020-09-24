package domain

import (
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/sendoushi/scrapper/config"
)

// FetchURL will fetch an URL
func FetchURL(c config.Config, dataArr []map[string]string, onNewData func(d []map[string]string)) ([]map[string]string, error) {
	// TODO: what about agent?
	// TODO: what about cookies?
	// TODO: what about local storage?

	var pagesVisited []string

	// old pages should be already on pages visited
	for _, value := range dataArr {
		if url, ok := value["URL"]; ok {
			pagesVisited = append(pagesVisited, url)
		}

		if url, ok := value["url"]; ok {
			pagesVisited = append(pagesVisited, url)
		}
	}

	limit := colly.LimitRule{
		// DomainGlob:  "*httpbin.*",
		Parallelism: 2,
		RandomDelay: 5 * time.Second,
	}

	collector := colly.NewCollector(
		// colly.AllowedDomains("racius.com"),

		// Cache responses to prevent multiple download of pages
		// even if the collector is restarted
		colly.CacheDir(c.GetCacheFolder()),
	)
	collector.Limit(&limit)

	// Create another collector to scrape company details
	detailCollector := collector.Clone()

	collector.OnRequest(func(r *colly.Request) {
		c.GetLogger().Log("-- visiting", r.URL.String())
	})

	collector.OnHTML(c.GetDataURLSelector(), func(e *colly.HTMLElement) {
		// don't request more than our limit
		if c.GetMaxPageRequests() < len(pagesVisited) {
			return
		}

		// find out the right src to go on
		src := e.Attr("src")
		href := e.Attr("href")
		nextPageLocation := href
		if len(href) == 0 {
			nextPageLocation = src
		}

		page := e.Request.AbsoluteURL(nextPageLocation)

		// dont go further if we have already gone there
		for _, pageVisited := range pagesVisited {
			if page == pageVisited {
				return
			}
		}

		// dont go further if we have the single in already
		for _, single := range dataArr {
			if single["URL"] == page {
				return
			}
		}

		pagesVisited = append(pagesVisited, page)

		c.GetLogger().Log("--- visiting_detail", page)
		detailCollector.Visit(page)
	})

	// Extract details of the single
	detailCollector.OnHTML(c.GetDataSelector(), func(e *colly.HTMLElement) {
		page := e.Request.URL.String()

		// dont go further if we have the single in already
		for _, single := range dataArr {
			if single["URL"] == page {
				return
			}
		}

		single, err := getSingleDetails(e, c)
		if err != nil {
			// DEV: it must be something related to a required, ignore
			return
		}

		// Save the single
		single["URL"] = page

		// iframe as a selector is a very specific case
		if c.GetDataSelector() == "iframe" {
			single["src"] = e.Attr("src")
			single["href"] = e.Attr("href")
		}

		dataArr = append(dataArr, single)

		// inform of changes
		onNewData(dataArr)
	})

	collector.OnHTML(c.GetCrawlSelector(), func(e *colly.HTMLElement) {
		// don't request more than our limit
		if c.GetMaxPageRequests() < len(pagesVisited) {
			return
		}

		// find out the right src to go on
		src := e.Attr("src")
		href := e.Attr("href")
		nextPageLocation := href
		if len(href) == 0 {
			nextPageLocation = src
		}

		page := e.Request.AbsoluteURL(nextPageLocation)

		// dont go further if we have already gone there
		for _, pageVisited := range pagesVisited {
			if page == pageVisited {
				return
			}
		}

		pagesVisited = append(pagesVisited, page)
		collector.Visit(page)
	})

	// Start scraping
	collector.Visit(c.GetBaseURL())

	// Wait until threads are finished
	collector.Wait()
	detailCollector.Wait()

	return dataArr, nil
}
