package ent

import "fmt"

const (
	ACTION_RECVEVENT_HEADER_TEMPLATE = `
#pragma once

#include "../async_call.h"

class RobotManager;
class Server;

AsyncCall* create{{.Metadata.FullName}}(Server&, RobotManager&);
	`

	ACTION_RECVEVENT_CPP_TEMPLATE = `
{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{.HeaderFileName}}"
{{range .Spec.Events}}
#include "{{.HeaderFileName}}"
{{end}}

#include "../async_call_impl.h"
#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>
#include <x51.grpc.pb.h>

using namespace fmt::literals;

{{$className := .Metadata.FullName}}

class {{$className}} : public AsyncCallImpl<{{$className}}, EventRequestParams, Result> {
public:
	{{$className}}(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}
protected:
	AsyncRequestMethod getRequestMethod() const override {
		return &::Broker::AsyncService::Request{{$className}};
	}

	void doReply() override {
		auto cid = request().connectionid();
		std::string acc = cid.account();
		std::string srv = cid.service();
		int idx = cid.index();

		auto robot = m_robotManager.findRobot(acc).lock();
		if (!robot) {
			auto e = reply().mutable_error();
			e->set_errorcode((int)whitebox::errc::CANNOT_FIND_ROBOT);
			e->set_errorcategory(whitebox::ERROR_CATEGORY);
			e->set_message("cannot find robot: acc={}"_format(acc));
		} else {
			auto conn = robot->findConnection(srv, idx).lock();
			if (!conn) {
				auto e = reply().mutable_error();
				e->set_errorcode((int)whitebox::errc::CANNOT_FIND_CONNECTION);
				e->set_errorcategory(whitebox::ERROR_CATEGORY);
				e->set_message("cannot find connection: acc={}, srv={}, idx={}"_format(acc, srv, idx));
			} else {
				conn->waitEvent([](IEvent* ev) {
					{{ range $i, $e := .Spec.Events }}
					if (ev->GetCLSID() == {{$e.Spec.EventName}}::_GetCLSID()) {
						return {{$i}};
					}
					{{ end }}
					return -1;
				}, [this](int matchedEventIndex, IEvent* ev) {
					{{range $i, $e := .Spec.Events}}
					if (matchedEventIndex == {{$i}}) {
						fillReplyBy{{ $e.Metadata.FullName }}(*({{$e.Spec.EventName}}*)ev, reply());
						finish();
						return;
					}
					{{end}}

					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::TIMEOUT);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					e->set_message("action {} timeout"_format("{{.Metadata.FullName}}"));
					finish();
				});

				return;
			}
		}
		finish();
	}

	AsyncCall* createNewInstance() override {
		return create{{$className}}(server(), m_robotManager);
	}
private:
	RobotManager& m_robotManager;
};

AsyncCall* create{{$className}}(Server& svr, RobotManager& rm) {
	return new {{ $className }}{svr, rm};
}
	
	`
)

type ActionRecvEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		EventRefs []string `yaml:"eventRefs"`
		Events    []*EventResponse
		// EventNames []string
	} `yaml:"spec"`

	HeaderCpp
}

func NewActionRecvEvent() *ActionRecvEvent {
	r := &ActionRecvEvent{}

	return r
}

func (e *ActionRecvEvent) Class() string {
	return CLASS_ACTION
}

func (e *ActionRecvEvent) Order() string {
	return ORDER_RECVEVENT
}

func (e *ActionRecvEvent) Name() string {
	return e.Metadata.Name
}

func (e *ActionRecvEvent) OnParsed() error {
	e.Metadata.fill(e, e.Spec.EventRefs[0])
	e.init(&e.Metadata)

	return nil
}

func (t *ActionRecvEvent) Generate() error {
	// 一个收发消息的动作生成2个文件
	err := executeTemplate(ACTION_RECVEVENT_HEADER_TEMPLATE, AUTOGEN_CPP_FOLDER, t.HeaderFileName, t)
	if err != nil {
		return err
	}

	err = executeTemplate(ACTION_RECVEVENT_CPP_TEMPLATE, AUTOGEN_CPP_FOLDER, t.CppFileName, t)
	if err != nil {
		return err
	}

	return nil
}

func (t *ActionRecvEvent) FillEventsByRef(eventMap map[string]Event) error {
	for _, ref := range t.Spec.EventRefs {
		e, ok := eventMap[ref]
		if !ok {
			return fmt.Errorf("cannot find event by ref %s", ref)
		}

		t.Spec.Events = append(t.Spec.Events, e.(*EventResponse))
	}

	return nil
}
