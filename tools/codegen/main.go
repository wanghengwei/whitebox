package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path"
	"text/template"

	"github.com/Masterminds/sprig"
	"github.com/golang/glog"
	"gopkg.in/yaml.v2"
)

func executeTemplate(tpl string, root string, outfile string, data interface{}) error {
	f, err := os.Create(path.Join(root, outfile))
	if err != nil {
		return err
	}
	defer f.Close()

	return template.Must(template.New("").Funcs(sprig.TxtFuncMap()).Parse(tpl)).Execute(f, data)
}

const (
	CMakeListsTemplate = `
add_library(autogen
	{{range .}}
	{{.}}
	{{end}}
	)
	target_link_libraries(autogen proto fmt)
	target_include_directories(autogen 
		INTERFACE ${CMAKE_CURRENT_SOURCE_DIR} 
		PRIVATE ${MGC_INCLUDE_DIRS}
	)
	target_compile_options(autogen
		PUBLIC
			-Wno-deprecated-declarations
	)
	
`

	X51ProtoTemplate = `
syntax = "proto3";

import "common.proto";

service Broker {
    
    rpc Connect (ConnectParams) returns (Result);

    {{range .}}
    rpc {{.Metadata.Name}} (ConnectionIdentity) returns (Result);
    {{end}}
}

	`

	InitGRPCAsyncCallsTemplate = `
#pragma once
{{range .}}
#include "{{.Metadata.Name}}.h"
{{end}}

class RobotManager;

void initGRPCAsyncCalls(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& rm) {
	{{range .}}
	process{{.Metadata.Name}}(srv, cq, rm);
	{{end}}
}
	
	`
)

func generate(root string, items []Entity) error {
	// 生成 cmakelists.txt
	files := []string{}
	for _, item := range items {
		files = append(files, item.OutputFileNames()...)
	}
	err := executeTemplate(CMakeListsTemplate, root, "CMakeLists.txt", files)
	if err != nil {
		return err
	}

	actions := []Entity{}
	for _, item := range items {
		if item.Class() == "Action" {
			actions = append(actions, item)
		}
	}
	err = executeTemplate(X51ProtoTemplate, "protos", "x51.proto", actions)
	if err != nil {
		return err
	}

	err = executeTemplate(InitGRPCAsyncCallsTemplate, root, "init_grpc_async_calls.h", actions)
	if err != nil {
		return err
	}

	return nil
}

// Entity 表示一个实体，如：Event Action
type Entity interface {
	Class() string
	Generate(root string) error
	OutputFileNames() []string
}

type Metadata struct {
	Name           string   `yaml:"name"`
	IncludeHeaders []string `yaml:"include_headers"`
}

// type Action interface {
// 	Class() string
// 	Name() string
// 	Prepare() error
// 	GenerateCode() error
// }

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
}

func (e *EventRequest) Class() string {
	return "Event"
}

const (
	EventRequestHpp = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}

void init_{{ .Spec.EventName }}({{ .Spec.EventName }}& ev);
`

	EventRequestCpp = `
#include "EventRequest_{{ .Spec.EventName }}.h"

void init_{{ .Spec.EventName }}({{ .Spec.EventName }}& ev) {
	{{ range .Spec.Params }}
	ev.{{ .Field }} = {{ .Value }};
	{{ end }}
}
	`
)

func (e *EventRequest) OutputFileNames() []string {
	return []string{
		fmt.Sprintf("EventRequest_%s.h", e.Spec.EventName),
		fmt.Sprintf("EventRequest_%s.cpp", e.Spec.EventName),
	}
}

func (e *EventRequest) Generate(root string) error {
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
				glog.Fatalf("no such type %s\n", vt)
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

	// 一个request event应该生成一个h和一个cpp文件，就是简单的填充一下
	err := executeTemplate(EventRequestHpp, root, fmt.Sprintf("EventRequest_%s.h", e.Spec.EventName), e)
	if err != nil {
		return err
	}

	err = executeTemplate(EventRequestCpp, root, fmt.Sprintf("EventRequest_%s.cpp", e.Spec.EventName), e)
	if err != nil {
		return err
	}

	return nil
}

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
}

func (e *EventResponse) Class() string {
	return "Event"
}

const (
	EventResponseHpp = `
#pragma once
{{ range .Metadata.IncludeHeaders }}
#include <{{ . }}>
{{ end }}
#include <common.pb.h>

void fillReply_{{ .Spec.EventName }}(const {{ .Spec.EventName }}& ev, Result& reply);
`

	EventResponseCpp = `
#include "EventResponse_{{ .Spec.EventName }}.h"
#include <boost/lexical_cast.hpp>

void fillReply_{{ .Spec.EventName }}(const {{ .Spec.EventName }}& ev, Result& reply) {
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

func (e *EventResponse) Generate(root string) error {
	// 一个 response event应该生成一个h和一个cpp文件，主要是生成返回的结果
	err := executeTemplate(EventResponseHpp, root, fmt.Sprintf("EventResponse_%s.h", e.Spec.EventName), e)
	if err != nil {
		return err
	}

	err = executeTemplate(EventResponseCpp, root, fmt.Sprintf("EventResponse_%s.cpp", e.Spec.EventName), e)
	if err != nil {
		return err
	}

	return nil
}

func (e *EventResponse) OutputFileNames() []string {
	return []string{
		fmt.Sprintf("EventResponse_%s.h", e.Spec.EventName),
		fmt.Sprintf("EventResponse_%s.cpp", e.Spec.EventName),
	}
}

func newEventItem(order string) Entity {
	switch order {
	case "Request":
		return &EventRequest{}
	case "Response":
		return &EventResponse{}
	default:
		log.Fatalf("no order %s\n", order)
		return nil
	}
}

type ActionSendRecvEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		SendSpec struct {
			EventName string `yaml:"eventName"`
		} `yaml:"send"`
		RecvSpec struct {
			EventNames []string `yaml:"eventNames"`
		} `yaml:"recv"`
	} `yaml:"spec"`
}

func (e *ActionSendRecvEvent) Class() string {
	return "Action"
}

const (
	ActionSendRecvEventTemplateHpp = `
#pragma once

#include <x51.grpc.pb.h>
#include "../async_call.h"

class RobotManager;

void process{{.Metadata.Name}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm);
	`

	ActionSendRecvEventTemplateCpp = `
{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{.Metadata.Name}}.h"
#include "EventRequest_{{ .Spec.SendSpec.EventName }}.h"

#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>

using namespace fmt::literals;

class {{.Metadata.Name}} : public AsyncCallImpl<{{.Metadata.Name}}> {
public:
	using AsyncCallImpl<{{.Metadata.Name}}>::AsyncCallImpl;
protected:
	void doRequest() override {
		m_srv->Request{{.Metadata.Name}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
	}

	void doReply() override {
		std::string acc = m_request.account();
		std::string srv = m_request.service();
		int idx = m_request.index();

		auto robot = m_robotManager.findRobot(acc);
		if (!robot) {
			auto e = m_reply.mutable_error();
			e->set_errorcode((int)whitebox::errc::CANNOT_FIND_ROBOT);
			e->set_errorcategory(whitebox::ERROR_CATEGORY);
			e->set_message("cannot find robot: acc={}"_format(acc));
		} else {
			auto conn = robot->findConnection(srv, idx);
			if (!conn) {
				auto e = m_reply.mutable_error();
				e->set_errorcode((int)whitebox::errc::CANNOT_FIND_CONNECTION);
				e->set_errorcategory(whitebox::ERROR_CATEGORY);
				e->set_message("cannot find connection: acc={}, srv={}, idx={}"_format(acc, srv, idx));
			} else {
				{{.Spec.SendSpec.EventName}} ev;
				init_{{.Spec.SendSpec.EventName}}(ev);
				conn->sendEvent(&ev);

				conn->waitEvent([](IEvent* ev) {
					return false
					{{ range .Spec.RecvSpec.EventNames }}
					|| ev->GetCLSID() == {{.}}::_GetCLSID()
					{{ end }}
					;
				}, [this]() {
					m_responder.Finish(m_reply, grpc::Status::OK, this);
				});

				return;
			}
		}
		m_responder.Finish(m_reply, grpc::Status::OK, this);
	}
};

void process{{ .Metadata.Name }}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm) {
	(new {{ .Metadata.Name }}{srv, cq, cm})->proceed();
}
	
	`
)

func (t *ActionSendRecvEvent) Generate(root string) error {
	if len(t.Metadata.Name) == 0 {
		t.Metadata.Name = fmt.Sprintf("ActionSendRecvEvent_%s", t.Spec.SendSpec.EventName)
	}

	// 一个收发消息的动作生成2个文件
	err := executeTemplate(ActionSendRecvEventTemplateHpp, root, fmt.Sprintf("%s.h", t.Metadata.Name), t)
	if err != nil {
		return err
	}

	err = executeTemplate(ActionSendRecvEventTemplateCpp, root, fmt.Sprintf("%s.cpp", t.Metadata.Name), t)
	if err != nil {
		return err
	}

	return nil
}

func (t *ActionSendRecvEvent) OutputFileNames() []string {
	return []string{
		fmt.Sprintf("%s.h", t.Metadata.Name),
		fmt.Sprintf("%s.cpp", t.Metadata.Name),
	}
}

func newActionItem(order string) Entity {
	switch order {
	case "SendRecvEvent":
		return &ActionSendRecvEvent{}
	default:
		log.Fatalf("no order %s\n", order)
		return nil
	}
}

func main() {
	flag.Parse()

	f, err := os.Open("actions.yaml")
	if err != nil {
		glog.Fatal(err)
	}

	d := yaml.NewDecoder(f)

	// actions := []Action{}

	items := []Entity{}

	// 先走一遍，把每个文档块的类型找出来
	for {
		tmp := map[interface{}]interface{}{}
		err := d.Decode(&tmp)
		if err != nil {
			break
		}

		// var a Action
		var item Entity

		cls := tmp["class"].(string)
		order := tmp["order"].(string)

		switch cls {
		case "SendEvent":
			// actions = append(actions, &SendEventAction{})
			break
		case "RecvEvent":
			// actions = append(actions, &RecvEventAction{})
			break
		case "SendRecvEvent":
			// a = &SendRecvEventAction{}
		case "Event": // Event
			item = newEventItem(order)
		case "Action": // Action
			item = newActionItem(order)
		default:

		}

		// actions = append(actions, a)
		items = append(items, item)
	}

	// 重新，正式读一遍并解析出合适的对象
	f.Seek(0, 0)
	d = yaml.NewDecoder(f)

	// for _, action := range actions {
	// 	d.Decode(action)
	// }

	for _, item := range items {
		err := d.Decode(item)
		if err != nil {
			log.Fatalf("decode failed: item=%v, err=%s", item, err)
		}
	}

	// 现在解析出对象了，需要生成代码
	// 有两种代码生成需求：一种是每个对象本身产生若干输出文件，一种是整体进行产出
	root := path.Join("broker", "autogen")

	for _, item := range items {
		item.Generate(root)
	}

	err = generate(root, items)
	if err != nil {
		log.Fatal(err)
	}

	// for _, action := range actions {
	// 	action.Prepare()
	// 	action.GenerateCode()
	// }

	// err = generate("x51.proto.tpl", "protos/x51.proto", actions)
	// if err != nil {
	// 	glog.Fatal(err)
	// }

	// err = generate("CMakeLists.txt.tpl", "broker/autogen/CMakeLists.txt", actions)
	// // tmpl, err = template.New("cmake").Funcs(sprig.TxtFuncMap()).Parse(cmakeTemplate)
	// if err != nil {
	// 	glog.Fatal(err)
	// }

	// err = generate("init_grpc_async_calls.h.tpl", "broker/autogen/init_grpc_async_calls.h", actions)
	// if err != nil {
	// 	glog.Fatal(err)
	// }

}
