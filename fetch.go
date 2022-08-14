package main

import (
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/raff/godet"
)

func createBrowser(port int) (*godet.RemoteDebugger, error) {
	chromeapp := "google-chrome-stable"
	chromeappArg := []string{
		"--headless",
		"--hide-scrollbars",
		"--blink-settings=imagesEnabled=false",
		"--window-size=800,600",
		fmt.Sprintf("-remote-debugging-port=%d", port),
		"--disable-extensions",
		"--disable-gpu",
		"--disable-default-apps",
		"--disable-crash-reporter",
		"--disable-notifications",
		"--disable-remote-fonts",
		"--disable-smooth-scrolling",
		"--disable-search-geolocation-disclosure",
		"--disable-prompt-on-repost",
		"--proxy-server='direct://'",
		"--proxy-bypass-list=*",
		"--allow-insecure-localhost",
	}
	cmd := exec.Command(chromeapp, chromeappArg...)
	err := cmd.Start()
	if err != nil {
		return nil, err
	}

	// will wait for chromium to start and connect
	time.Sleep(5 * time.Second)
	// DEV: if debug needed, change false to true
	remote, err := godet.Connect(fmt.Sprintf("localhost:%d", port), false)
	if err != nil {
		return nil, err
	}

	remote.RuntimeEvents(true)
	remote.PageEvents(true)
	remote.DOMEvents(true)
	remote.LogEvents(false)

	return remote, nil
}

func closeBrowser(remote *godet.RemoteDebugger, port int) error {
	// close the connection first
	if remote != nil {
		err := remote.Close()
		if err != nil {
			return err
		}
	}

	// close the app afterwards
	killapp := "kill"
	killappArg := []string{fmt.Sprintf("$(lsof -t -i:%d)", port)}
	cmd := exec.Command(killapp, killappArg...)
	err := cmd.Start()
	if err != nil {
		return err
	}

	return nil
}

func waitForLoad(remote *godet.RemoteDebugger, waitRenderTime time.Duration, done chan bool) {
	var wg sync.WaitGroup
	wg.Add(1)

	// make sure the page is loaded
	remote.CallbackEvent("Page.frameStoppedLoading", func(params godet.Params) {
		// we want to wait so we are sure that the page is loaded and js run
		time.Sleep(waitRenderTime)

		// sanity check, do we have a document?
		rawDoc, err := remote.GetDocument()
		if err != nil || rawDoc == nil || rawDoc["root"] == nil {
			// wait a tad more to make sure we do have something
			time.Sleep(time.Second)
		}

		wg.Done()
	})

	wg.Wait()
	done <- true
}

func getDocumentNodeId(remote *godet.RemoteDebugger) (int, error) {
	if remote == nil {
		return 0, errors.New("no remote provided")
	}

	rawDoc, err := remote.GetDocument()
	if err != nil || rawDoc["root"] == nil {
		return 0, err
	}

	nodeIdRaw := rawDoc["root"].(map[string]interface{})["nodeId"]
	if nodeIdRaw == nil {
		return 0, err
	}

	nodeID := int(nodeIdRaw.(float64))
	return nodeID, nil
}

func getSelectorNodeIds(remote *godet.RemoteDebugger, selector string) ([]int, error) {
	docIds := []int{}

	nodeID, err := getDocumentNodeId(remote)
	if err != nil {
		return docIds, err
	}

	docRaw, err := remote.QuerySelectorAll(nodeID, selector)
	if err != nil || docRaw["nodeIds"] == nil {
		return docIds, err
	}

	docRawIds := docRaw["nodeIds"].([]interface{})
	for _, v := range docRawIds {
		if v == nil {
			continue
		}

		id := int(v.(float64))
		docIds = append(docIds, id)
	}

	return docIds, nil
}

type Fetch struct {
	port int
	remote *godet.RemoteDebugger
}

func (f *Fetch) Open(port int) error {
	// lets make sure that we kill all the opens before hand
	if f.remote != nil {
		// DEV: lets just use the one we have right now
		if f.port == port {
			return nil
		}

		_ = closeBrowser(f.remote, port)
	}

	// TODO: we should use the same app browser and not keep creating and closing
	remote, err := createBrowser(port)
	if err != nil {
		return err
	}

	f.port = port
	f.remote = remote

	return nil
}

func (f *Fetch) Close() error {
	err := closeBrowser(f.remote, f.port)
	if err != nil {
		return err
	}

	f.port = 0
	f.remote = nil

	return nil
}

func (f *Fetch) GetURL(url string, waitRenderTime time.Duration) error {
	if f.remote == nil {
		err := f.Open(f.port)
		if err != nil {
			return err
		}
	}

	_, err := f.remote.Navigate(url)
	if err != nil {
		return err
	}

	done := make(chan bool, 1)
	go waitForLoad(f.remote, waitRenderTime, done)
	<- done

	return nil
}

func (f *Fetch) GetSelectorData(selector string, dataType string, dataOptions string) ([]string, error) {
	docData := []string{}

	docIds, err := getSelectorNodeIds(f.remote, selector)
	if err != nil {
		return docData, err
	}

	for _, id := range docIds {
		docHTML, err := f.remote.GetOuterHTML(id)
		if err != nil {
			return docData, err
		}
		docHTML = strings.ReplaceAll(strings.ToValidUTF8(strings.TrimSpace(docHTML), " "), "\n", "")

		// need to setup a javascript so that the browser can handle for us
		js := []string{
			fmt.Sprintf("var htmlStr = `%s`;", docHTML),
			"var wrap = document.createElement(\"div\");",
			"wrap.insertAdjacentHTML(\"afterbegin\", htmlStr);",
		}

		switch dataType {
		case "outerHtml":
			docData = append(docData, docHTML)
		case "attr":
			// need to setup a javascript so that the browser can handle for us
			js = append(js, fmt.Sprintf("return wrap.firstElementChild.getAttribute(`%s`);", dataOptions))

			docRaw, err := f.remote.EvaluateWrap(strings.Join(js[:], ""))
			if err != nil || docRaw == nil {
				return docData, err
			}

			docData = append(docData, docRaw.(string))
		default:
			// need to setup a javascript so that the browser can handle for us
			js = append(js, "return wrap.firstElementChild.innerHTML;")

			docRaw, err := f.remote.EvaluateWrap(strings.Join(js[:], ""))
			if err != nil || docRaw == nil {
				return docData, err
			}

			docData = append(docData, docRaw.(string))
		}
	}

	return docData, nil
}