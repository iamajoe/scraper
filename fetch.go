package scraper

import (
	"errors"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/raff/godet"
)

func fetchChromeURLContent(
	url string,
	chromeHost string,
	waitRenderTime time.Duration,
) ([]byte, error) {
	// DEV: if debug needed, change false to true
	remote, err := godet.Connect(chromeHost, false)
	if err != nil {
		return nil, err
	}
	defer remote.Close()

	// block loading of most images
	err = remote.SetBlockedURLs("*.jpg", "*.png", "*.gif")
	if err != nil {
		return nil, err
	}

	// setup a tab for this url
	tab, err := remote.NewTab(url)
	if err != nil {
		return []byte{}, err
	}
	defer remote.CloseTab(tab)

	// enable events
	remote.RuntimeEvents(true)
	remote.PageEvents(true)
	remote.DOMEvents(true)
	remote.LogEvents(false)

	// navigate in existing tab
	err = remote.ActivateTab(tab)
	if err != nil {
		return []byte{}, err
	}

	// make sure the page is loaded
	docBodyCh := make(chan string)
	errCh := make(chan error)

	// setup an event to listen for the page to be fully loaded
	remote.CallbackEvent("Page.frameStoppedLoading", func(params godet.Params) {
		// we want to wait so we are sure that the page is loaded and js run
		time.Sleep(waitRenderTime)

		// sanity check, do we have a document?
		rawDoc, err := remote.GetDocument()
		if err != nil {
			errCh <- err
			return
		}

		nodeIdRaw := rawDoc["root"].(map[string]interface{})["nodeId"]
		if nodeIdRaw == nil {
			docBodyCh <- ""
			return
		}

		nodeID := int(nodeIdRaw.(float64))
		html, err := remote.GetOuterHTML(nodeID)
		if err != nil {
			errCh <- err
			return
		}

		docBodyCh <- html
	})

	// wait for either the error or the body to come in
	select {
	case err := <-errCh:
		return []byte{}, err
	case docBody := <-docBodyCh:
		return []byte(docBody), nil
	}
}

func FetchURL(url string, options map[string]interface{}) ([]byte, error) {
	// TODO: we could have some authorization / headers to be set
	// TODO: should somewhere setup a worker queue

	// run with chrome (a way to run with js)
	if chromeHost, ok := options["chromeHost"]; ok && len(chromeHost.(string)) > 0 {
		wait := time.Second
		if waitRaw, ok := options["waitRenderTime"]; ok {
			wait = time.Millisecond * time.Duration(waitRaw.(int))
		}

		return fetchChromeURLContent(url, chromeHost.(string), wait)
	}

	// run with http client request
	res, err := http.Get(url)
	if err != nil {
		return []byte{}, err
	}

	if res.StatusCode != 200 {
		return []byte{}, errors.New("wrong status code")
	}

	resBody, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return []byte{}, err
	}

	return resBody, nil
}
