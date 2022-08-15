package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCrawlerStart(t *testing.T) {
	server := httptest.NewServer(http.FileServer(http.Dir("./test_cases")))
	defer server.Close()

	f := Fetch{9222, nil}
	defer f.Close()

	c := Crawl{
		&f,
		".pagination a",
		time.Millisecond,
		time.Millisecond,
		"h1",
		"",
		"",
		false,
	}
	defer c.Stop()

	// run the test...
	var updResults []string
	var updUrlsToFetch []string
	var updUrlsFetched []string
	updCount := 0

	results, err := c.Start(
		func(
			res []string,
			toFetch []string,
			fetched []string,
			err error,
		) {
			if err != nil {
				t.Error(err)
			}

			updResults = res
			updUrlsToFetch = toFetch
			updUrlsFetched = fetched

			updCount = updCount + 1
		},
		[]string{fmt.Sprintf("%s/case_1.html", server.URL)},
		[]string{},
		[]string{},
	)

	if err != nil {
		t.Error(err)
	}

	contentCount := 3

	if len(updUrlsToFetch) != 0 || len(updUrlsFetched) != contentCount {
		t.Error("didnt fetch all urls")
	}

	if updCount != contentCount && len(updUrlsFetched)+1 != updCount {
		t.Error("didnt update enough times")
	}

	if len(updResults) != len(results) && len(results) != contentCount {
		t.Error("updated results differ from final")
	}
}
