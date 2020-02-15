package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"io/ioutil"
	"sort"
	"strings"
)

// encodeCSV encodes data to csv
func encodeCSV(rows []map[string]string) ([]byte, error) {
	// fmt.Printf("%+v\n", single)
	var columns []string

	// iterate each piece of data
	for _, single := range rows {
		// iterate each key on the mapping
		for k := range single {
			// first lets handle the columns
			foundColumn := false
			for _, column := range columns {
				if column == k {
					foundColumn = true
					break
				}
			}

			if !foundColumn {
				columns = append(columns, k)
			}
		}
	}

	sort.Strings(columns)

	// DEV: copied from https://stackoverflow.com/questions/25877965/idiomatic-conversion-of-mapstringstring-to-csv-byte
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write(columns); err != nil {
		return nil, err
	}

	r := make([]string, len(columns))
	for _, row := range rows {
		for i, column := range columns {
			r[i] = row[column]
		}

		if err := w.Write(r); err != nil {
			return nil, err
		}
	}

	w.Flush()
	return buf.Bytes(), nil
}

// exportData handles the array coming in and exports it
func exportData(data []map[string]string, outputFile string) (err error) {
	var file []byte

	if strings.Contains(outputFile, ".json") {
		file, err = json.MarshalIndent(data, "", " ")
		if err != nil {
			return err
		}
	} else if strings.Contains(outputFile, ".csv") {
		file, err = encodeCSV(data)
		if err != nil {
			return err
		}
	}

	err = ioutil.WriteFile(outputFile, file, 0644)
	if err != nil {
		return err
	}

	return nil
}
