package scraper

import (
	"bytes"
	"reflect"
	"strings"

	"github.com/andybalholm/cascadia"
	"golang.org/x/net/html"
)

func Query(n *html.Node, query string) []*html.Node {
	sel, err := cascadia.Parse(query)
	if err != nil {
		return []*html.Node{}
	}

	return cascadia.QueryAll(n, sel)
}

func Attr(n *html.Node, name string) string {
	for _, a := range n.Attr {
		if a.Key == name {
			return a.Val
		}
	}

	return ""
}

type queryFilter struct {
	kind    string
	options map[string]interface{}
}

func (f *queryFilter) matchIsAttrContains(n *html.Node) bool {
	attrNameRaw, ok := f.options["attrName"]
	if !ok || reflect.TypeOf(attrNameRaw).String() != "string" {
		return false
	}

	valueRaw, ok := f.options["value"]
	if !ok || reflect.TypeOf(valueRaw).String() != "string" {
		return false
	}

	attrValue := Attr(n, attrNameRaw.(string))
	return strings.Contains(attrValue, valueRaw.(string))
}

func (f *queryFilter) Match(n *html.Node) bool {
	if f.kind == "isAttrContains" {
		return f.matchIsAttrContains(n)
	}

	return false
}

func newQueryFilterIsAttrContains(attrName string, value string) *queryFilter {
	opts := make(map[string]interface{})
	opts["attrName"] = attrName
	opts["value"] = value

	return &queryFilter{kind: "isAttrContains", options: opts}
}

func AttrContains(nodes []*html.Node, attrName string, value string) []*html.Node {
	filter := newQueryFilterIsAttrContains(attrName, value)
	newNodes := cascadia.Filter(nodes, filter)
	return newNodes
}

func TreeToHTML(n *html.Node) []byte {
	buf := bytes.Buffer{}
	html.Render(&buf, n)
	return buf.Bytes()
}

func HtmlToTree(raw []byte) (*html.Node, error) {
	return html.Parse(bytes.NewReader(raw))
}
