# scraper

***

## Development

### Install

1. Install [Go](https://golang.org/doc/install)
2. `make install`
3. `make install-go-dev` (if you want some more dev tools)

TODO: check https://github.com/marcusolsson/goddd/blob/master/inmem/inmem.go

#### SublimeText 3

Just a [guideline](https://www.alexedwards.net/blog/streamline-your-sublime-text-and-go-workflow) to help you out when developing a Go project

1. `make install-go-dev`
2. Install: [Gofmt](https://github.com/noonat/sublime-gofmt), [GoGuru](https://github.com/alvarolm/GoGuru), [gocode](https://github.com/mdempsky/gocode)
3. Install through package manager: `GoGuru`, `Gofmt`
4. Edit `Preferences > Package Settings > Gofmt > Settings - User` with: 
  ```json
  {
    "cmds": [
      ["goimports"]
    ],
    "format_on_save": true
  }
  ```

#### Run

1. `make test`
2. `make build`
3. `./bin/cmd`
