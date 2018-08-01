package ent

import "fmt"

const (
	EVENT_RESPONSE_HEADER_TEMPLATE = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}
#include <common.pb.h>

void fillReplyBy{{ .Metadata.FullName }}(const {{ .Spec.EventName }}& ev, Result& reply);
`

	EVENT_RESPONSE_CPP_TEMPLATE = `
#include "{{.HeaderFileName}}"
#include <boost/lexical_cast.hpp>

void fillReplyBy{{ .Metadata.FullName }}(const {{ .Spec.EventName }}& ev, Result& reply) {
	auto ec = ev.{{.Spec.ErrorCodeField}};
	if (ec != 0) {
		auto err = reply.mutable_error();
		err->set_errorcode(ec);
		return;
	}
	auto t = reply.mutable_data();
	auto d = t->mutable_data();
	{{ range .Spec.Results }}
	(*d)["{{ .Field }}"] = boost::lexical_cast<std::string>(ev.{{.Field}});
	{{ end }}
}
	`
)

type EventResponse struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		EventName      string `yaml:"eventName"`
		ErrorCodeField string `yaml:"errorCodeField"`
		Results        []struct {
			Field    string `yaml:"field"`
			Constant string `yaml:"isErrorCode"`
		} `yaml:"results"`
	} `yaml:"spec"`

	HeaderFileName string
	CppFileName    string
}

func (e *EventResponse) Class() string {
	return CLASS_EVENT
}

func (e *EventResponse) Order() string {
	return ORDER_RESPONSE
}

func (e *EventResponse) OnParsed() error {
	e.Metadata.fill(e, e.Spec.EventName)

	e.HeaderFileName = fmt.Sprintf("%s.h", e.Metadata.FullName)
	e.CppFileName = fmt.Sprintf("%s.cpp", e.Metadata.FullName)

	return nil
}

func (e *EventResponse) Generate() error {
	// 一个 response event应该生成一个h和一个cpp文件，主要是生成返回的结果
	err := executeTemplate(EVENT_RESPONSE_HEADER_TEMPLATE, AUTOGEN_CPP_FOLDER, e.HeaderFileName, e)
	if err != nil {
		return err
	}

	err = executeTemplate(EVENT_RESPONSE_CPP_TEMPLATE, AUTOGEN_CPP_FOLDER, e.CppFileName, e)
	if err != nil {
		return err
	}

	return nil
}

func (e *EventResponse) OutputFileNames() []string {
	return []string{
		// fmt.Sprintf("EventResponse_%s.h", e.Spec.EventName),
		// fmt.Sprintf("EventResponse_%s.cpp", e.Spec.EventName),
		e.HeaderFileName,
		e.CppFileName,
	}
}
