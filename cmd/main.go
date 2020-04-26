package main

import (
	"os"

	"github.com/go-kit/kit/log"
	"github.com/sendoushi/scrapper/config"
	"github.com/sendoushi/scrapper/domain"
)

func main() {
	var logger log.Logger
	logger = log.NewLogfmtLogger(log.NewSyncWriter(os.Stderr))
	logger = log.With(logger, "ts", log.DefaultTimestampUTC)

	c, err := config.GetConfig(logger)
	if err != nil {
		panic(err)
	}

	// ignore the error, just use it as empty, it always returns empty
	// even with an error
	// we use this to pre-populate the scraping data
	savedFile, _ := decodeCSV(c.GetOutputFile())

	_, err = domain.FetchURL(c, savedFile, func(newDataArr []map[string]string) {
		err = exportData(newDataArr, c.GetOutputFile())
		if err != nil {
			panic(err)
		}
	})
	if err != nil {
		panic(err)
	}
}
