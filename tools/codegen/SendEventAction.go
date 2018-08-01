package main

// import (
// 	"fmt"

// 	"github.com/golang/glog"
// )

// type SendEventSpec struct {
// 	EventName string `yaml:"eventName"`
// 	Params    []struct {
// 		Field     string `yaml:"field"`
// 		Constant  string `yaml:"constant"`
// 		ValueFrom string `yaml:"valueFrom"`
// 		ValueType string `yaml:"type"`
// 		Value     string
// 	} `yaml:"params"`
// }

// func (s *SendEventSpec) Prepare() error {
// 	for i := range s.Params {

// 		vt := s.Params[i].ValueType
// 		if len(vt) == 0 {
// 			vt = "String"
// 		}

// 		consantValue := s.Params[i].Constant
// 		if len(consantValue) > 0 {
// 			// 用常量来赋值
// 			switch vt {
// 			case "Int32":
// 				s.Params[i].Value = consantValue
// 				break
// 			case "Symbol":
// 				s.Params[i].Value = consantValue
// 				break
// 			case "String":
// 				s.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
// 				break
// 			default:
// 				glog.Fatalf("no such type %s\n", vt)
// 			}

// 			continue
// 		}

// 		valueFrom := s.Params[i].ValueFrom
// 		if len(valueFrom) > 0 {
// 			// get value from player data
// 			s.Params[i].Value = "1"
// 			continue
// 		}
// 	}

// 	return nil
// }

// type SendEventAction struct {
// 	// ActionType     string        `yaml:"type"`
// 	Spec           SendEventSpec `yaml:"spec"`
// 	IncludeHeaders []string      `yaml:"include_headers"`
// }

// func (act *SendEventAction) Name() string {
// 	return act.Spec.EventName
// }

// func (act *SendEventAction) Type() string {
// 	return "SendEvent"
// }

// func (act *SendEventAction) Prepare() error {
// 	for i := range act.Spec.Params {

// 		vt := act.Spec.Params[i].ValueType
// 		if len(vt) == 0 {
// 			vt = "String"
// 		}

// 		consantValue := act.Spec.Params[i].Constant
// 		if len(consantValue) > 0 {
// 			// 用常量来赋值
// 			switch vt {
// 			case "Int32":
// 				act.Spec.Params[i].Value = consantValue
// 				break
// 			case "Symbol":
// 				act.Spec.Params[i].Value = consantValue
// 				break
// 			case "String":
// 				act.Spec.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
// 				break
// 			default:
// 				glog.Fatalf("no such type %s\n", vt)
// 			}

// 			continue
// 		}

// 		valueFrom := act.Spec.Params[i].ValueFrom
// 		if len(valueFrom) > 0 {
// 			// get value from player data
// 			act.Spec.Params[i].Value = "1"
// 			continue
// 		}
// 	}

// 	return nil
// }

// func (act *SendEventAction) GenerateCode() error {

// 	return generateEventAction(act)
// }
