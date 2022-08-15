# Scraper

## Install dependencies

```
# install chrome (Ex: ubuntu / debian)
apt-get update && apt-get install -y fonts-liberation
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
apt-get update && apt-get install -y google-chrome-stable

go get .
go mod download
```

## Example: Fetch

```go
f := Fetch{9222, nil}
defer f.Close()

// wait time is used to make sure that any javascript has been run
// if the request page is SSR, you could just set time.Millisecond
err := f.GetURL("http://google.com", time.Second)
if err != nil {
	panic(err)
}

// accepted dataType: "attr" | "outerHtml" | (<default>|"innerHTML")
// only "attr" dataType needs a dataOptions which is the name of the attribute
res, err := f.GetSelectorData("body div form", "attr", "action")
if err != nil {
	panic(err)
}
```

## Example: Crawl

```go
f := Fetch{9222, nil}
defer f.Close()

// arguments will later on be passed to Fetch, as such, all that is
// accepted on Fetch, is also accepted on Crawl
c := Crawl{
	&f,
	".pagination a",
	time.Millisecond,
	time.Millisecond,
	"body div form",
	"attr",
	"action",
	false,
	[]string{},
}

res, err := c.Start(
	func(
		res []string,
		toFetch []string,
		fetched []string,
		err error,
	) {
		// ...
	},
	[]string{"http://google.com"},
	[]string{},
	[]string{},
)

// to stop without waiting for it to finish, use:
err = c.Stop()

// check if it is running with:
c.Running

// access the result slice with:
c.Result
```

## Test

```
go fmt
go vet
go test
```