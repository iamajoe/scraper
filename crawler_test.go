package main

import (
	"testing"
)

func TestCrawlerMergeUrls(t *testing.T) {
	type test struct {
		urlA        string
		urlB        string
		expectedStr string
	}
	tests := []test{
		{"http://fooba.com", "/foo", "http://fooba.com/foo"},
		{"http://fooba.com", "foo", "http://fooba.com/foo"},
		{"https://fooba.com", "/foo", "https://fooba.com/foo"},
		{"https://fooba.com", "./foo", "https://fooba.com/foo"},
		{"https://fooba.com", "foo", "https://fooba.com/foo"},
		{"www.fooba.com", "/foo", "https://www.fooba.com/foo"},
		{"www.fooba.com/bar", "/foo", "https://www.fooba.com/foo"},
		{"www.fooba.com", "./foo", "https://www.fooba.com/foo"},
		{"www.fooba.com", "foo", "https://www.fooba.com/foo"},
		{"http://fooba.com", "http://bar.com", "http://bar.com"},
	}

	// test the success case scenarios
	for i, test := range tests {
		// run the test
		res, err := mergeUrls(test.urlA, test.urlB)
		if err != nil {
			t.Error(err, "mergeUrls")
			continue
		}

		if res != test.expectedStr {
			t.Error("result not expected string", i, res, "!=", test.expectedStr)
		}
	}
}

func TestCrawlerStart(t *testing.T) {
	// server := httptest.NewServer(http.FileServer(http.Dir("./test_cases")))
	// defer server.Close()
	// f := Fetch{9222, nil}
	// defer f.Close()

	// c := Crawl{&f, ".pagination a", time.Millisecond}
}
