package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestFetchGetURL(t *testing.T) {
	// setup the test
	server := httptest.NewServer(http.FileServer(http.Dir("./test_cases")))
	defer server.Close()
	f := Fetch{9222, nil}
	defer f.Close()

	// success case
	err := f.GetURL(fmt.Sprintf("%s/case_1.html", server.URL), time.Millisecond)
	if err != nil {
		t.Error(err, "GetURL")
		return
	}

	// 404 case
	rand.Seed(time.Now().UnixNano())
	randomNumber := rand.Intn(99999-100+1) + 100
	err = f.GetURL(fmt.Sprintf("http://abc_%d_def_very_diff_domain.io", randomNumber), time.Millisecond)
	if err == nil {
		t.Error("domain should have been NOT_RESOLVED")
		return
	}
}

func TestFetchGetSelectorData(t *testing.T) {
	type test struct {
		selector       string
		dataType       string
		dataOptions    string
		expectedLength int
		expectedStr    string
	}
	tests := []test{
		// test inner html
		{"body .main p", "", "", 1, "On the main"},
		// test outer html
		{"body .main p", "outerHtml", "", 1, "<p>On the main"},
		// test attribute
		{"body .main p a", "attr", "href", 1, "/case_nested.html"},
	}

	// setup the test
	server := httptest.NewServer(http.FileServer(http.Dir("./test_cases")))
	defer server.Close()
	f := Fetch{9222, nil}
	defer f.Close()

	err := f.GetURL(fmt.Sprintf("%s/case_1.html", server.URL), time.Millisecond)
	if err != nil {
		t.Error(err, "GetURL")
		return
	}

	// test the success case scenarios
	for i, test := range tests {
		// run the test
		res, err := f.GetSelectorData(test.selector, test.dataType, test.dataOptions)
		if err != nil {
			t.Error(err, "GetSelectorData")
			continue
		}

		if len(res) != test.expectedLength {
			t.Error(i, "err document length")
			continue
		}

		for _, resValue := range res {
			if !strings.Contains(resValue, test.expectedStr) {
				t.Error(i, "err expected value")
				continue
			}
		}
	}
}
