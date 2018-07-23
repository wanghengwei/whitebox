package main

import (
	"fmt"
	"log"
	"os"
	"text/template"

	"gopkg.in/yaml.v2"

	"github.com/Masterminds/sprig"
)

const (
	eventHpp = `
	#pragma once
	#include <x51.grpc.pb.h>
	#include "../async_call.h"
	void process{{.Spec.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm);
	`

	sendEventCpp = `
		{{with .Spec}}
		#include "{{.EventName}}.h"
		class Send{{.EventName}} : public AsyncCallImpl<Send{{.EventName}}> {
		public:
			using AsyncCallImpl<Send{{.EventName}}>::AsyncCallImpl;
		protected:
			void doRequest() override {
				m_srv->RequestSend{{.EventName}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
			}
		
			void doReply() override {
				std::string acc = m_request.account();
				std::string srv = m_request.service();
				int idx = m_request.connectionindex();
				auto conn = m_connMgr.findConnection(acc, srv, idx);
				{{.EventName}} ev;
				{{range .Params}}
				ev.{{.Field}} = {{.Value}};
				{{end}}
				conn->sendEvent(&ev);
				m_responder.Finish(m_reply, grpc::Status::OK, this);
			}
		};

		void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) {
			(new Send{{.EventName}}{srv, cq, cm})->proceed();
		}
		{{end}}
	`

	recvEventCpp = `
		{{with .Spec}}
		#include "{{.EventName}}.h"
		class Recv{{.EventName}} : public AsyncCallImpl<Recv{{.EventName}}> {
		public:
			using AsyncCallImpl<Recv{{.EventName}}>::AsyncCallImpl;
		protected:
			void doRequest() override {
				m_srv->RequestRecv{{.EventName}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
			}
		
			void doReply() override {
				std::string acc = m_request.account();
				std::string srv = m_request.service();
				int idx = m_request.connectionindex();
				auto conn = m_connMgr.findConnection(acc, srv, idx);
				
				conn->waitEvent([](const CEvent&) {
					return true;
				}, [this]() {
					m_responder.Finish(m_reply, grpc::Status::OK, this);
				});
			}
		};
		void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) {
			(new Recv{{.EventName}}{srv, cq, cm})->proceed();
		}
		{{end}}
	`

	proto = `
	service Broker {
		{{range .}}
		rpc {{.ActionType | trimSuffix "Event"}}{{.Spec.EventName}} (ConnectionIdentity) returns (Result);
		{{end}}
	}
	`

	cmakeTemplate = `
	add_library(autogen
	{{range .}}
	{{.Spec.EventName}}.h
	{{.Spec.EventName}}.cpp
	{{end}}
	)
	target_include_directories(autogen PUBLIC ${CMAKE_BINARY_DIR} INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})
	`
)

type Action interface {
	GenerateCode() error
}

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
	} `yaml:"spec"`
}

func (act *SendEventAction) GenerateCode() error {

	for i := range act.Spec.Params {
		valueFrom := act.Spec.Params[i].ValueFrom
		if len(valueFrom) > 0 {
			// get value from player data
			act.Spec.Params[i].Value = "1"
			continue
		}
	}

	// 默认写到 ./broker/autogen/CEventXXX.cpp
	out, err := os.Create(fmt.Sprintf("broker/autogen/%s.cpp", act.Spec.EventName))
	if err != nil {
		return err
	}
	defer out.Close()

	tmpl, err := template.New("SendEventAction").Parse(sendEventCpp)
	if err != nil {
		return err
	}

	err = tmpl.Execute(out, act)
	if err != nil {
		return err
	}

	hpp, err := os.Create(fmt.Sprintf("broker/autogen/%s.h", act.Spec.EventName))
	if err != nil {
		return err
	}
	defer hpp.Close()

	tmpl, err = template.New("SendEventActionHpp").Parse(eventHpp)
	if err != nil {
		return err
	}

	err = tmpl.Execute(hpp, act)
	if err != nil {
		return err
	}

	return nil
}

type RecvEventAction struct {
	ActionType string `yaml:"type"`
	Spec       struct {
		EventName string `yaml:"eventName"`
	} `yaml:"spec"`
}

func (act *RecvEventAction) GenerateCode() error {
	tmpl, err := template.New("RecvEventAction").Parse(recvEventCpp)
	if err != nil {
		return err
	}

	out, err := os.Create(fmt.Sprintf("broker/autogen/%s.cpp", act.Spec.EventName))
	if err != nil {
		return err
	}
	defer out.Close()

	err = tmpl.Execute(out, act)
	if err != nil {
		return err
	}

	hpp, err := os.Create(fmt.Sprintf("broker/autogen/%s.h", act.Spec.EventName))
	if err != nil {
		return err
	}
	defer hpp.Close()

	tmpl, err = template.New("RecvEventActionHpp").Parse(eventHpp)
	if err != nil {
		return err
	}

	err = tmpl.Execute(hpp, act)
	if err != nil {
		return err
	}

	return nil
}

func main() {
	f, err := os.Open("actions.yaml")
	if err != nil {
		log.Fatal(err)
	}

	d := yaml.NewDecoder(f)

	actions := []Action{}

	for {
		tmp := map[interface{}]interface{}{}
		err := d.Decode(&tmp)
		if err != nil {
			break
		}

		switch tmp["type"] {
		case "SendEvent":
			actions = append(actions, &SendEventAction{})
			break
		case "RecvEvent":
			actions = append(actions, &RecvEventAction{})
			break
		default:

		}
	}

	f.Seek(0, 0)
	d = yaml.NewDecoder(f)

	for _, action := range actions {
		d.Decode(action)
	}

	for _, action := range actions {
		action.GenerateCode()
	}

	tmpl, err := template.New("proto").Funcs(sprig.TxtFuncMap()).Parse(proto)
	if err != nil {
		log.Fatal(err)
	}

	// tmpl.Funcs(sprig.FuncMap())
	tmpl.Execute(os.Stdout, actions)

	tmpl, err = template.New("autogen").Funcs(sprig.TxtFuncMap()).Parse(cmakeTemplate)
	if err != nil {
		log.Fatal(err)
	}

	// tmpl.Funcs(sprig.FuncMap())
	autogenCMake, err := os.Create("broker/autogen/CMakeLists.txt")
	if err != nil {
		log.Fatal(err)
	}
	tmpl.Execute(autogenCMake, actions)

}
