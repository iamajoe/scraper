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

## Example

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

## Test

```
go fmt
go vet
go test
```