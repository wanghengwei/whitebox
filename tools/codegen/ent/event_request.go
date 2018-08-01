package ent

import (
	"fmt"
)

const (
	EVENT_REQUEST_HEADER_TEMPLATE = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}

void init{{ .Metadata.FullName }}({{ .Spec.EventName }}& ev);
`

	EVENT_REQUEST_CPP_TEMPLATE = `
#include "{{.HeaderFileName}}"

void init{{ .Metadata.FullName }}({{ .Spec.EventName }}& ev) {
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
			Field     string `yaml:"field"`
			Constant  string `yaml:"constant"`
			ValueFrom string `yaml:"valueFrom"`
			ValueType string `yaml:"type"`
			Value     string
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

func (e *EventRequest) OutputFileNames() []string {
	return []string{
		// fmt.Sprintf("EventRequest_%s.h", e.Spec.EventName),
		// fmt.Sprintf("EventRequest_%s.cpp", e.Spec.EventName),
		e.HeaderFileName,
		e.CppFileName,
	}
}

func (e *EventRequest) OnParsed() error {
	e.Metadata.fill(e, e.Spec.EventName)

	s := &e.Spec
	for i := range s.Params {

		vt := s.Params[i].ValueType
		if len(vt) == 0 {
			vt = "String"
		}

		consantValue := s.Params[i].Constant
		if len(consantValue) > 0 {
			// 用常量来赋值
			switch vt {
			case "Int32":
				s.Params[i].Value = consantValue
				break
			case "Symbol":
				s.Params[i].Value = consantValue
				break
			case "String":
				s.Params[i].Value = fmt.Sprintf(`"%s"`, consantValue)
				break
			default:
				return fmt.Errorf("no such type %s", vt)
			}

			continue
		}

		valueFrom := s.Params[i].ValueFrom
		if len(valueFrom) > 0 {
			// get value from player data
			s.Params[i].Value = "1"
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
