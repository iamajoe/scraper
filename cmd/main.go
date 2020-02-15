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

	dataArr, err := domain.FetchURL(c.GetBaseURL(), c)
	if err != nil {
		panic(err)
	}

	err = exportData(dataArr, c.GetOutputFile())
	if err != nil {
		panic(err)
	}
}
