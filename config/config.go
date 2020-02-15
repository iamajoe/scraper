package config

import (
	"encoding/json"
	"errors"
	"flag"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/go-kit/kit/log"
)

// DetailConfig represents a configuration coming in
type DetailConfig struct {
	Name         string         `json:"name"`
	TypeSelector string         `json:"type"`
	Selector     string         `json:"selector"`
	Equals       string         `json:"equals"`
	Required     bool           `json:"required"`
	Children     []DetailConfig `json:"children"`
}

// ScrapeConfig represents a configuration coming in
type ScrapeConfig struct {
	BaseURL         string         `json:"baseURL"`
	MaxPageRequests int            `json:"maxPageRequests"`
	CacheFolder     string         `json:"cacheFolder"`
	OutputFile      string         `json:"outputFile"`
	CrawlSelector   string         `json:"crawlSelector"`
	DataURLSelector string         `json:"dataURLSelector"`
	DataSelector    string         `json:"dataSelector"`
	Details         []DetailConfig `json:"details"`
}

// Config represent entity of the config
type Config struct {
	initialized     bool
	logger          log.Logger
	baseURL         string
	cacheFolder     string
	outFile         string
	maxPageRequests int

	crawlSelector   string
	dataURLSelector string
	dataSelector    string
	details         []DetailConfig
}

var lock = &sync.Mutex{}
var instance Config

// GetConfig returns the global config for the project
func GetConfig(logger log.Logger) (Config, error) {
	lock.Lock()
	defer lock.Unlock()

	if instance.initialized {
		return instance, nil
	}

	var (
		defMaxPageReq  = envInt("MAX_PAGE_REQUESTS", 0)
		defCacheFolder = envString("CACHE_FOLDER", "")
		defOutFile     = envString("OUT_FILE", "")

		baseURL         = flag.String("url", "", "Base url to scrape")
		maxPageRequests = flag.Int("maxPageRequests", defMaxPageReq, "Maximum page requests")
		cacheFolder     = flag.String("cacheFolder", defCacheFolder, "Cache folder")
		outFile         = flag.String("output", defOutFile, "Output file")

		configFile = flag.String("config", "", "Configuration file")
	)

	flag.Parse()

	var (
		parsedBaseURL     = *baseURL
		parsedMaxRequests = *maxPageRequests
		parsedCacheFolder = *cacheFolder
		parsedOutFile     = *outFile

		crawlSelector   string
		dataURLSelector string
		dataSelector    string
		details         []DetailConfig
	)

	// parse a config file coming in
	if *configFile != "" {
		logger.Log("loading_config", *configFile)

		file, err := ioutil.ReadFile(*configFile)
		if err != nil {
			return Config{}, err
		}

		var data ScrapeConfig
		err = json.Unmarshal([]byte(file), &data)
		if err != nil {
			return Config{}, err
		}

		if parsedBaseURL == "" {
			parsedBaseURL = data.BaseURL
		}

		if parsedMaxRequests == 0 {
			parsedMaxRequests = data.MaxPageRequests
		}

		if parsedCacheFolder == "" {
			parsedCacheFolder = data.CacheFolder
		}

		if parsedOutFile == "" {
			parsedOutFile = data.OutputFile
		}

		crawlSelector = data.CrawlSelector
		dataURLSelector = data.DataURLSelector
		dataSelector = data.DataSelector
		details = data.Details
	}

	if parsedBaseURL == "" {
		return Config{}, errors.New("Base URL is required")
	}

	// make sure the output file has the csv extension
	if !strings.Contains(parsedOutFile, ".json") && !strings.Contains(parsedOutFile, ".csv") {
		parsedOutFile = parsedOutFile + ".csv"
	}

	// initialize it
	instance = Config{
		initialized:     true,
		logger:          logger,
		baseURL:         parsedBaseURL,
		maxPageRequests: parsedMaxRequests,
		cacheFolder:     parsedCacheFolder,
		outFile:         parsedOutFile,

		crawlSelector:   crawlSelector,
		dataURLSelector: dataURLSelector,
		dataSelector:    dataSelector,
		details:         details,
	}

	return instance, nil
}

// GetLogger retrieves logger
func (c Config) GetLogger() log.Logger {
	return c.logger
}

// GetBaseURL retrieves base url
func (c Config) GetBaseURL() string {
	return c.baseURL
}

// GetMaxPageRequests retrieves max page requests
func (c Config) GetMaxPageRequests() int {
	return c.maxPageRequests
}

// GetCacheFolder retrieves caching folder
func (c Config) GetCacheFolder() string {
	return c.cacheFolder
}

// GetOutputFile retrieves output file
func (c Config) GetOutputFile() string {
	return c.outFile
}

// GetCrawlSelector retrieves crawl selector
func (c Config) GetCrawlSelector() string {
	return c.crawlSelector
}

// GetDataURLSelector retrieves data url selector
func (c Config) GetDataURLSelector() string {
	return c.dataURLSelector
}

// GetDataSelector retrieves data selector
func (c Config) GetDataSelector() string {
	return c.dataSelector
}

// GetDetails retrieves details
func (c Config) GetDetails() []DetailConfig {
	return c.details
}

// envString parses the system ENV variable
func envString(env, fallback string) string {
	e := os.Getenv(env)
	if e == "" {
		return fallback
	}
	return e
}

// envInt parses the system ENV variable
func envInt(env string, fallback int) int {
	e := os.Getenv(env)

	i, err := strconv.Atoi(e)
	if err != nil || i == 0 {
		return fallback
	}

	return i
}

// envBool parses the system ENV variable
func envBool(env string, fallback bool) bool {
	e := os.Getenv(env) == "true" || os.Getenv(env) == "TRUE" || os.Getenv(env) == "1"
	return e
}
