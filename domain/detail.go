package domain

import (
	"errors"
	"strings"
	"sync"

	"github.com/gocolly/colly/v2"
	"github.com/sendoushi/scrapper/config"
)

// getInternalDetail sets on a single the internal details
func getInternalDetail(el *colly.HTMLElement, detail config.DetailConfig, single map[string]string, c config.Config) error {
	switch detail.TypeSelector {
	case "SimpleScrape":
		var err error
		var wg sync.WaitGroup
		wg.Add(1)

		// DEV: this special case needs to create a scraper to try and find
		//			the right data
		collector := colly.NewCollector()

		collector.OnHTML(detail.Selector, func(nestedEl *colly.HTMLElement) {
			for _, child := range detail.Children {
				err = getInternalDetail(nestedEl, child, single, c)
			}

			wg.Done()
		})

		// we want to make sure variables are replaced on the url
		url := detail.URL
		for k, value := range single {
			url = strings.ReplaceAll(url, "[["+k+"]]", value)
		}

		// visit the page
		c.GetLogger().Log("--- visiting_internal_detail", url)
		collector.Visit(url)
		wg.Wait()

		if err != nil {
			return err
		}
	case "ChildText":
		single[detail.Name] = el.ChildText(detail.Selector)

		if detail.Required && single[detail.Name] == "" {
			return errors.New("required " + detail.Name + " field not present")
		}
	case "ForEach":
		var err error

		el.ForEach(detail.Selector, func(_ int, nestedEl *colly.HTMLElement) {
			for _, child := range detail.Children {
				err = getInternalDetail(nestedEl, child, single, c)
			}
		})

		if err != nil {
			return err
		}
	case "Case":
		if detail.Equals == el.ChildText(detail.Selector) {
			for _, child := range detail.Children {
				err := getInternalDetail(el, child, single, c)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// getSingleDetails gets single details from html element
func getSingleDetails(el *colly.HTMLElement, c config.Config) (map[string]string, error) {
	single := make(map[string]string)

	for _, detail := range c.GetDetails() {
		err := getInternalDetail(el, detail, single, c)
		if err != nil {
			return single, err
		}
	}

	return single, nil
}
