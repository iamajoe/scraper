SUBPACKAGES := $(shell go list ./...)
GO_FILES=$(shell find . -name '*.go' | grep -v /vendor/ | grep -v _test.go | uniq)

.DEFAULT_GOAL := help

.PHONY: generate
generate: ## Invoke go generate
	go generate ./...

.PHONY: install
install: ## Run install of dependencies
	@go get -u golang.org/x/lint/golint
	@go get golang.org/x/tools/cmd/goimports
	@GO111MODULE=on go get -v ...
	@GO111MODULE=on go mod tidy
	@GO111MODULE=on go mod vendor

.PHONY: test
test: ## Run go test
	@make generate
	@gofmt -w $(GO_FILES)
	# @goimports -w $(GO_FILES)
	@golint -set_exit_status $(GO_FILES)
	# @go test -v$(SUBPACKAGES)
	@go test ./... -test.v -failfast

build: ## Build the app
	@go build -v -o ./bin/cmd ./cmd

.PHONY: help
help: ## Help
	@grep -E '^[0-9a-zA-Z_/()$$-]+:.*?## .*$$' $(lastword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
