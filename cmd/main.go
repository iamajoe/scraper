package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"

	"github.com/gocolly/colly/v2"
)

const maxPages = 500
const maxCompanyPages = 10000
const baseURL = "https://www.racius.com/empresas-em-portugal/em-atividade/"
const paginationSelector = ".pagination a[href]"
const companyURLSelector = "a.title[href]"
const companyDetailsSelector = ".container .row .row"

// Company stores information about a company
type Company struct {
	URL           string
	Title         string
	NIF           string
	Address       string
	SocialCapital string
	CAE           string
	AvailableActs string
	LastUpdate    string
	FoundingDate  string
	LegalForm     string
}

// gets company details from html element
func getCompanyDetails(e *colly.HTMLElement) *Company {
	company := Company{
		Title: e.ChildText(".report-subtitle span"),
	}

	// Iterate over rows of the table which contains different information
	// about the company
	e.ForEach(".company-table-block tr", func(_ int, el *colly.HTMLElement) {
		switch el.ChildText("td:first-child") {
		case "NIF":
			company.NIF = el.ChildText("td:nth-child(2)")
			company.Address = el.ChildText("td:nth-child(4)")
		case "Forma Jurídica":
			company.LegalForm = el.ChildText("td:nth-child(2)")
			company.SocialCapital = el.ChildText("td:nth-child(4)")
		case "Data Constituição":
			company.FoundingDate = el.ChildText("td:nth-child(2)")
			company.CAE = el.ChildText("td:nth-child(4)")
		case "Última Atualização":
			company.LastUpdate = el.ChildText("td:nth-child(2)")
			company.AvailableActs = el.ChildText("td:nth-child(4)")
		}
	})

	if company.Title == "" || company.NIF == "" {
		return nil
	}

	return &company
}

func main() {
	c := colly.NewCollector(
		// colly.AllowedDomains("racius.com"),

		// Cache responses to prevent multiple download of pages
		// even if the collector is restarted
		colly.CacheDir("./_cache"),
	)

	// Create another collector to scrape company details
	detailCollector := c.Clone()

	pagesVisited := make([]string, 0, maxPages)
	companies := make([]Company, 0, maxCompanyPages)

	c.OnHTML(companyURLSelector, func(e *colly.HTMLElement) {
		companyURL := e.Request.AbsoluteURL(e.Attr("href"))

		// dont go further if we have the company in already
		for _, company := range companies {
			if company.URL == companyURL {
				return
			}
		}

		// If attribute class is this long string return from callback
		// As this a is irrelevant
		fmt.Println("--- visiting company:", companyURL)
		detailCollector.Visit(companyURL)
	})

	c.OnHTML(paginationSelector, func(e *colly.HTMLElement) {
		if e.Attr("class") == "active" {
			return
		}

		page := e.Request.AbsoluteURL(e.Attr("href"))

		// dont go further if we have already gone there
		for _, pageVisited := range pagesVisited {
			if page == pageVisited {
				return
			}
		}

		pagesVisited = append(pagesVisited, page)
		c.Visit(page)
	})

	// Before making a request print "Visiting ..."
	c.OnRequest(func(r *colly.Request) {
		fmt.Println("-- visiting", r.URL.String())
	})

	// Extract details of the company
	detailCollector.OnHTML(companyDetailsSelector, func(e *colly.HTMLElement) {
		companyURL := e.Request.URL.String()

		// dont go further if we have the company in already
		for _, company := range companies {
			if company.URL == companyURL {
				return
			}
		}

		company := getCompanyDetails(e)
		if company == nil {
			return
		}

		// Save the company
		company.URL = companyURL
		companies = append(companies, *company)
	})

	// Start scraping
	c.Visit(baseURL)

	file, _ := json.MarshalIndent(companies, "", " ")
	_ = ioutil.WriteFile("data.json", file, 0644)
}
