package main

import (
	"log"
	"os"

	"gopkg.in/yaml.v2"
)

type SendEventAction struct {
	actionType string `yaml:"type"`
}

func main() {
	f, err := os.Open("../actions.yaml")
	if err != nil {
		log.Fatal(err)
	}

	action := map[interface{}]interface{}{}

	d := yaml.NewDecoder(f)
	err = d.Decode(&action)
	if err != nil {
		log.Fatal(err)
	}
}
