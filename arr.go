package main

import "strings"

func replaceAtIndex(input string, replacement string, index int) string {
	return input[:index] + replacement + input[index+1:]
}

func removeFromArray(value string, arr []string) []string {
	for i, original := range arr {
		if value == original {
			arr = append(arr[:i], arr[i+1:]...)
		}
	}

	return arr
}

func isInArray(value string, arr []string) bool {
	for _, original := range arr {
		if value == original {
			return true
		}
	}

	return false
}

func isContentInArray(value string, arr []string) bool {
	for _, original := range arr {
		if strings.Contains(value, original) {
			return true
		}
	}

	return false
}

func addUniqueInArray(values []string, arr []string) []string {
	// lets make sure that the content is unique
	for _, value := range values {
		found := false

		for _, cachedContent := range arr {
			if value == cachedContent {
				found = true
				break
			}
		}

		if !found {
			arr = append(arr, value)
		}
	}

	return arr
}
