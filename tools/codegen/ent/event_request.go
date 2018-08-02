package ent

import (
	"fmt"

	"github.com/golang/glog"
)

const (
	EVENT_REQUEST_HEADER_TEMPLATE = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}
#include <common.pb.h>

class Robot;

void init{{ .Metadata.FullName }}({{ .Spec.EventName }}& ev, const EventRequestParams& request, const Robot& robot);
`

	EVENT_REQUEST_CPP_TEMPLATE = `
#include "{{.HeaderFileName}}"
#include <boost/lexical_cast.hpp>
#include "../robot.h"

void init{{ .Metadata.FullName }}({{ .Spec.EventName }}& ev, const EventRequestParams& request, const Robot& robot) {
	{{ range .Spec.Params }}
	ev.{{ .Field }} = {{ .Value }};
	{{ end }}
}
	`
)

// EventRequest 用来描述一个发送消息。一个发送消息关键在于如何填充这个消息的字段
type EventRequest struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		EventName string `yaml:"eventName"`
		Params    []struct {
			Field    string `yaml:"field"`
			Constant string `yaml:"constant"`
			// Expression string `yaml:"expression"` // 表示一个c++表达式，原封不动的放到生成的代码里
			FromPlayerData string `yaml:"fromPlayerData"` // 表示从玩家数据里取
			ValueType      string `yaml:"type"`
			Value          string
		} `yaml:"params"`
	} `yaml:"spec"`

	HeaderFileName string
	CppFileName    string
}

func (e *EventRequest) Class() string {
	return CLASS_EVENT
}

func (e *EventRequest) Order() string {
	return ORDER_REQUEST
}

func (e *EventRequest) Name() string {
	return e.Metadata.Name
}

func (e *EventRequest) EventName() string {
	return e.Spec.EventName
}

func (e *EventRequest) OutputFileNames() []string {
	return []string{
		// fmt.Sprintf("EventRequest_%s.h", e.Spec.EventName),
		// fmt.Sprintf("EventRequest_%s.cpp", e.Spec.EventName),
		e.HeaderFileName,
		e.CppFileName,
	}
}

// 把一个字面量转成目标对象的c++代码表示。repr是yml里面用户写的内容，比如字符串的话是不带引号的
func constantToValue(vt string, repr string) string {
	switch vt {
	case "Int32":
		return repr
	case "Symbol":
		return repr
	case "String":
		return fmt.Sprintf(`"%s"`, repr)
	case "Expression":
		// 用一个表达式。注意用个括号
		return fmt.Sprintf(`(%s)`, repr)
	default:
		glog.Fatalf("no such type %s", vt)
	}

	return ""
}

// 把字符串的值转成目标类型的c++代码。这里repr是一个表达式，表达式的值是string
func stringToValue(vt string, repr string) string {
	switch vt {
	case "Int32":
		return fmt.Sprintf(`boost::lexical_cast<int>(%s)`, repr)
	default:
		glog.Fatalf("cannot convert type: %s\n", vt)

	}

	return ""
}

func (e *EventRequest) OnParsed() error {
	e.Metadata.fill(e, e.Spec.EventName)

	s := &e.Spec
	for i := range s.Params {
		param := &s.Params[i]

		vt := s.Params[i].ValueType
		if len(vt) == 0 {
			vt = "String"
		}

		consantValue := s.Params[i].Constant
		if len(consantValue) > 0 {
			param.Value = constantToValue(vt, consantValue)
			// // 用常量来赋值
			// switch vt {
			// case "Int32":
			// 	s.Params[i].Value = consantValue
			// 	break
			// case "Symbol":
			// 	s.Params[i].Value = consantValue
			// 	break
			// case "String":
			// 	s.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
			// 	break
			// case "Expression":
			// 	// 用一个表达式。注意用个括号
			// 	param.Value = fmt.Sprintf(`(%s)`, param.Constant)
			// 	break
			// default:
			// 	return fmt.Errorf("no such type %s", vt)
			// }

			continue
		}

		// if len(param.Expression) > 0 {
		// 	// 用一个表达式。注意用个括号
		// 	param.Value = fmt.Sprintf(`(%s)`, param.Expression)
		// 	continue
		// }

		if len(param.FromPlayerData) > 0 {
			// get value from player data
			repr := fmt.Sprintf(`robot.getProperty("%s")`, param.FromPlayerData)
			param.Value = stringToValue(vt, repr)
			continue
		}
	}

	e.HeaderFileName = fmt.Sprintf("%s.h", e.Metadata.FullName)
	e.CppFileName = fmt.Sprintf("%s.cpp", e.Metadata.FullName)

	return nil
}

func (e *EventRequest) Generate() error {

	// 一个request event应该生成一个h和一个cpp文件，就是简单的填充一下
	err := executeTemplate(EVENT_REQUEST_HEADER_TEMPLATE, AUTOGEN_CPP_FOLDER, e.HeaderFileName, e)
	if err != nil {
		return err
	}

	err = executeTemplate(EVENT_REQUEST_CPP_TEMPLATE, AUTOGEN_CPP_FOLDER, e.CppFileName, e)
	if err != nil {
		return err
	}

	return nil
}