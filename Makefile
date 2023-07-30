BINARY_NAME=$(shell basename $(CURDIR))
BINARY_PATH=./bin/${BINARY_NAME}
GOCMD=go

GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
CYAN   := $(shell tput -Txterm setaf 6)
RESET  := $(shell tput -Txterm sgr0)

.PHONY: all install build run clean test test_race_coverage vet lint help

all: help

install:
	go get ./...
	go mod vendor
	go mod tidy
	go mod download

build: install ## Build your project and put the output binary
	$(GOCMD) build -o ${BINARY_PATH} ./...

run: ## Run the project
	go run .

clean: ## Remove build related file
	$(GOCMD) clean
	rm ${BINARY_PATH}*

test: ## Run the tests of the project
	@make vet
	@make lint
	@make test_race_coverage

test_race_coverage: ## Runs the tests with race and coverage
	$(GOCMD) test -race ./... -coverprofile=coverage.out

vet: ## Vets the project
	$(GOCMD) vet -v

lint: ## Lints the project
	golines -w -l .
	goimports -w -l .
	gofumpt -l -w .

help: ## Show this help.
	@echo ''
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} { \
		if (/^[a-zA-Z_-]+:.*?##.*$$/) {printf "    ${YELLOW}%-20s${GREEN}%s${RESET}\n", $$1, $$2} \
		else if (/^## .*$$/) {printf "  ${CYAN}%s${RESET}\n", substr($$1,4)} \
		}' $(MAKEFILE_LIST)

