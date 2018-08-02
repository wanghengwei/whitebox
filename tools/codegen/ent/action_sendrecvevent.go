package ent

import "fmt"

const (
	ACTION_SENDRECVEVENT_HEADER_TEMPLATE = `
#pragma once

#include <x51.grpc.pb.h>
#include "../async_call_impl.h"

class AsyncCallFactory;

void process{{.Metadata.FullName}}(AsyncCallFactory& fac);
	`

	ACTION_SENDRECVEVENT_CPP_TEMPLATE = `
{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{.HeaderFileName}}"
#include "{{.Spec.SendSpec.Event.HeaderFileName}}"
{{range .Spec.RecvSpec.Events}}
#include "{{.HeaderFileName}}"
{{end}}

#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>

using namespace fmt::literals;

class {{.Metadata.FullName}} : public AsyncCallImpl<{{.Metadata.FullName}}, EventRequestParams, Result> {
public:
	using AsyncCallImpl<{{.Metadata.FullName}}, EventRequestParams, Result>::AsyncCallImpl;
protected:
	RequestMethod getRequestMethod() override {
		return &::Broker::AsyncService::Request{{.Metadata.FullName}};
	}

	void doReply() override {
		auto cid = m_request.connectionid();
		std::string acc = cid.account();
		std::string srv = cid.service();
		int idx = cid.index();

		auto robot = m_robotManager->findRobot(acc);
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
				{{.Spec.SendSpec.Event.Spec.EventName}} ev;
				init{{.Spec.SendSpec.Event.Metadata.FullName}}(ev, m_request, *robot);
				conn->sendEvent(&ev);

				conn->waitEvent([](IEvent* ev) {
					{{ range $i, $e := .Spec.RecvSpec.Events }}
					if (ev->GetCLSID() == {{$e.Spec.EventName}}::_GetCLSID()) {
						return {{$i}};
					}
					{{ end }}
					return -1;
				}, [this](int matchedEventIndex, IEvent* ev) {
					{{range $i, $e := .Spec.RecvSpec.Events}}
					if (matchedEventIndex == {{$i}}) {
						fillReplyBy{{ $e.Metadata.FullName }}(*({{$e.Spec.EventName}}*)ev, m_reply);
						m_responder.Finish(m_reply, grpc::Status::OK, this);
						return;
					}
					{{end}}

					auto e = m_reply.mutable_error();
					e->set_errorcode((int)whitebox::errc::TIMEOUT);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					e->set_message("action %s timeout"_format("{{.Metadata.FullName}}"));
					m_responder.Finish(m_reply, grpc::Status::OK, this);
				});

				return;
			}
		}
		m_responder.Finish(m_reply, grpc::Status::OK, this);
	}
};

void process{{ .Metadata.FullName }}(AsyncCallFactory& fac) {
	fac.create<{{ .Metadata.FullName }}>()->proceed();
}
	
	`
)

type ActionSendRecvEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		SendSpec struct {
			EventRef string `yaml:"eventRef"`
			Event    *EventRequest
			// EventName string
		} `yaml:"send"`
		RecvSpec struct {
			EventRefs []string `yaml:"eventRefs"`
			Events    []*EventResponse
			// EventNames []string
		} `yaml:"recv"`
	} `yaml:"spec"`

	HeaderCpp
}

func (e *ActionSendRecvEvent) Class() string {
	return CLASS_ACTION
}

func (e *ActionSendRecvEvent) Order() string {
	return ORDER_SENDRECVEVENT
}

func (e *ActionSendRecvEvent) Name() string {
	return e.Metadata.Name
}

func (e *ActionSendRecvEvent) OnParsed() error {
	e.Metadata.fill(e, e.Spec.SendSpec.EventRef)
	e.init(&e.Metadata)

	// 通过event ref找到真正的event name

	return nil
}

func (t *ActionSendRecvEvent) Generate() error {
	// 一个收发消息的动作生成2个文件
	err := executeTemplate(ACTION_SENDRECVEVENT_HEADER_TEMPLATE, AUTOGEN_CPP_FOLDER, t.HeaderFileName, t)
	if err != nil {
		return err
	}

	err = executeTemplate(ACTION_SENDRECVEVENT_CPP_TEMPLATE, AUTOGEN_CPP_FOLDER, t.CppFileName, t)
	if err != nil {
		return err
	}

	return nil
}

func (t *ActionSendRecvEvent) FillEventsByRef(eventMap map[string]Event) error {
	e, ok := eventMap[t.Spec.SendSpec.EventRef]
	if !ok {
		return fmt.Errorf("cannot find event by ref %s", t.Spec.SendSpec.EventRef)
	}

	t.Spec.SendSpec.Event = e.(*EventRequest)
	// t.Spec.SendSpec.EventName = e.EventName()

	for _, ref := range t.Spec.RecvSpec.EventRefs {
		e, ok = eventMap[ref]
		if !ok {
			return fmt.Errorf("cannot find event by ref %s", t.Spec.SendSpec.EventRef)
		}

		t.Spec.RecvSpec.Events = append(t.Spec.RecvSpec.Events, e.(*EventResponse))
		// t.Spec.RecvSpec.EventNames = append(t.Spec.RecvSpec.EventNames, e.EventName())
	}

	return nil
}

// func (t *ActionSendRecvEvent) OutputFileNames() []string {
// 	return []string{
// 		fmt.Sprintf("%s.h", t.Metadata.Name),
// 		fmt.Sprintf("%s.cpp", t.Metadata.Name),
// 	}
// }
