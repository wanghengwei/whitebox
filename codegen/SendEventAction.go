package main

import (
	"fmt"

	"github.com/golang/glog"
)

type SendEventAction struct {
	ActionType string `yaml:"type"`
	Spec       struct {
		EventName string `yaml:"eventName"`
		Params    []struct {
			Field     string `yaml:"field"`
			Constant  string `yaml:"constant"`
			ValueFrom string `yaml:"valueFrom"`
			ValueType string `yaml:"type"`
			Value     string
		} `yaml:"params"`
		IncludeHeaders []string `yaml:"include_headers"`
	} `yaml:"spec"`
}

func (act *SendEventAction) GetActionName() string {
	return act.Spec.EventName
}

func (act *SendEventAction) GenerateCode() error {

	for i := range act.Spec.Params {

		vt := act.Spec.Params[i].ValueType
		if len(vt) == 0 {
			vt = "String"
		}

		consantValue := act.Spec.Params[i].Constant
		if len(consantValue) > 0 {
			// 用常量来赋值
			switch vt {
			case "Int32":
				act.Spec.Params[i].Value = consantValue
				break
			case "Symbol":
				act.Spec.Params[i].Value = consantValue
				break
			case "String":
				act.Spec.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
				break
			default:
				glog.Fatalf("no such type %s\n", vt)
			}

			continue
		}

		valueFrom := act.Spec.Params[i].ValueFrom
		if len(valueFrom) > 0 {
			// get value from player data
			act.Spec.Params[i].Value = "1"
			continue
		}
	}

	return generateAction("Send", act)
}
