package ent

import (
	"fmt"
	"strconv"

	"github.com/golang/glog"
)

const (
	EVENT_REQUEST_HEADER_TEMPLATE = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}
#include <common.pb.h>
#include <boost/lexical_cast.hpp>

class Robot;

void init{{ .Metadata.FullName }}({{ .Spec.EventName }}& ev, const EventRequestParams& request, const Robot& robot);
`

	EVENT_REQUEST_CPP_TEMPLATE = `
#include "{{.HeaderFileName}}"
#include "../robot.h"
#include "../errors.h"
#include <boost/exception/all.hpp>
#include <fmt/format.h>
#include <boost/log/trivial.hpp>

using namespace fmt::literals;

{{ $eventName := .Spec.EventName }}

void init{{ .Metadata.FullName }}({{ $eventName }}& ev, const EventRequestParams& request, const Robot& robot) {
	{{ range .Spec.Params }}
	{
		auto raw = {{.RawValue}};
		BOOST_LOG_TRIVIAL(info) << "set {{ $eventName }}.{{.Field}} = " << raw;
		try {
			ev.{{.Field}} = {{.CastFunc}}(raw);
		} catch (const boost::bad_lexical_cast& ex) {
			throw boost::enable_error_info(ex) << whitebox::errmsg("value: \"{}\", dstType: {}, raw: {}"_format(raw, {{.ValueType | quote}}, {{.RawValue | quote}}));
		}
	}
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
			Field          string `yaml:"field"`
			Constant       string `yaml:"constant"`
			Expression     string `yaml:"expression"`     // 表示一个c++表达式，原封不动的放到生成的代码里
			FromPlayerData string `yaml:"fromPlayerData"` // 表示从玩家数据里取
			ValueType      string `yaml:"type"`
			// Value          string
			RawValue string // cast之前的值
			CastFunc string
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
	case "Int":
		return repr
	case "LongLong":
		return repr
	case "Symbol":
		return repr
	case "String":
		return strconv.Quote(repr)
	default:
		glog.Fatalf("no such type %s", vt)
		return ""
	}
}

// 把字符串的值转成目标类型的c++代码。这里repr是一个表达式，表达式的值是string
func castFuncByTargetType(vt string) string {
	switch vt {
	case "Int":
		return `boost::lexical_cast<int>`
	case "LongLong":
		return "boost::lexical_cast<long long>"
	default:
		return ""
	}
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
			param.RawValue = constantToValue(vt, consantValue)
			// param.ValueBeforeCast = param.Value
			continue
		}

		if len(param.Expression) > 0 {
			// 用一个表达式。注意用个括号
			param.RawValue = fmt.Sprintf(`(%s)`, param.Expression)
			param.CastFunc = castFuncByTargetType(vt)
			continue
		}

		if len(param.FromPlayerData) > 0 {
			// get value from player data
			// 这个repr的结果肯定是个string
			repr := fmt.Sprintf(`robot.getProperty("%s")`, param.FromPlayerData)
			param.RawValue = repr
			param.CastFunc = castFuncByTargetType(vt)
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
