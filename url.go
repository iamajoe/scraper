package main

import (
	"fmt"
	"net/url"
	"strings"
)

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

	// find the domain (we don't want hostname because it might have a port for example)
	urlABase := strings.ReplaceAll(urlAWithProtocol, fmt.Sprintf("%s://", urlAParsed.Scheme), "")
	urlABase = strings.Split(urlABase, "/")[0]
	urlABase = fmt.Sprintf("%s://%s", urlAParsed.Scheme, urlABase)

	// remove the first characters if path based, we don't need them
	urlBParsed := urlB
	if string(urlBParsed[0]) == "." && string(urlBParsed[1]) == "/" {
		urlBParsed = replaceAtIndex(urlBParsed, "", 0)
	}

	if string(urlBParsed[0]) == "/" {
		urlBParsed = replaceAtIndex(urlBParsed, "", 0)
	}

	newUrl := fmt.Sprintf("%s/%s", urlABase, urlBParsed)
	return newUrl, nil
}
