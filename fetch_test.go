package main

import (
	"strings"
	"testing"
	"time"
)

func TestFetchGetURL(t *testing.T) {
	f := Fetch{9222, nil}
	defer f.Close()

	// success case
	err := f.GetURL("http://joesantos.io", time.Millisecond)
	if err != nil {
		t.Error(err, "GetURL")
		return
	}

	// 404 case
	err = f.GetURL("http://joesantos_abc_def_very_diff_domain.io", time.Millisecond)
	if err == nil {
		t.Error("domain should have been NOT_RESOLVED")
		return
	}
}

func TestFetchGetSelectorData(t *testing.T) {
	type test struct {
		selector string
		dataType string
		dataOptions string
		expectedLength int
		expectedStr string
	}
	tests := []test{
		// test inner html
		{"section article:first-child .truncate.title.title--a", "", "", 1, "a class=\"truncate\""},
		// test outer html
		{"section article:first-child .truncate.title.title--a", "outerHtml", "", 1, "<h2"},
		// test attribute
		{"section article:first-child .truncate.title.title--a a", "attr", "rel", 1, "bookmark"},
	}

	// setup the test
	f := Fetch{9222, nil}
	defer f.Close()

	err := f.GetURL("http://joesantos.io", time.Millisecond)
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

		if len(res) != test.expectedLength{
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