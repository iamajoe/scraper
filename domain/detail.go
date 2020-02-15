package domain

import (
	"errors"

	"github.com/gocolly/colly/v2"
	"github.com/sendoushi/scrapper/config"
)

// getInternalDetail sets on a single the internal details
func getInternalDetail(el *colly.HTMLElement, detail config.DetailConfig, single map[string]string) error {
	// fmt.Printf("%+v\n\n\n", detail.TypeSelector)
	switch detail.TypeSelector {
	case "ChildText":
		single[detail.Name] = el.ChildText(detail.Selector)

		if detail.Required && single[detail.Name] == "" {
			return errors.New("required " + detail.Name + " field not present")
		}
	case "ForEach":
		var err error

		el.ForEach(detail.Selector, func(_ int, nestedEl *colly.HTMLElement) {
			for _, child := range detail.Children {
				err = getInternalDetail(nestedEl, child, single)
			}
		})

		if err != nil {
			return err
		}
	case "Case":
		if detail.Equals == el.ChildText(detail.Selector) {
			for _, child := range detail.Children {
				err := getInternalDetail(el, child, single)
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
		err := getInternalDetail(el, detail, single)
		if err != nil {
			return single, err
		}
	}

	return single, nil
}
