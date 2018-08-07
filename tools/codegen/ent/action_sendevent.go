package ent

import "fmt"

const (
	ACTION_SENDEVENT_HEADER_TEMPLATE = `
#pragma once

#include "../async_call.h"

class RobotManager;
class Server;

AsyncCall* create{{.Metadata.FullName}}(Server&, RobotManager&);
	`

	ACTION_SENDEVENT_CPP_TEMPLATE = `
{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{.HeaderFileName}}"
#include "{{.Spec.Event.HeaderFileName}}"

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
				{{.Spec.Event.Spec.EventName}} ev;
				try {
					init{{.Spec.Event.Metadata.FullName}}(ev, request(), *robot);
					conn->sendEvent(&ev);
				} catch (const boost::bad_lexical_cast& ex) {
					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::BAD_CAST);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					if (const std::string* info = boost::get_error_info<whitebox::errmsg>(ex)) {
						e->set_message(*info);
					}
				}
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

// 以后把sendspec提出来和sendrecvevent共用代码
type ActionSendEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		EventRef string `yaml:"eventRef"`
		Event    *EventRequest
		// EventName string
	} `yaml:"spec"`

	HeaderCpp
}

func NewActionSendEvent() *ActionSendEvent {
	r := &ActionSendEvent{}

	return r
}

func (e *ActionSendEvent) Class() string {
	return CLASS_ACTION
}

func (e *ActionSendEvent) Order() string {
	return ORDER_SENDEVENT
}

func (e *ActionSendEvent) Name() string {
	return e.Metadata.Name
}

func (e *ActionSendEvent) OnParsed() error {
	e.Metadata.fill(e, e.Spec.EventRef)
	e.init(&e.Metadata)

	// 通过event ref找到真正的event name

	return nil
}

func (t *ActionSendEvent) Generate() error {
	// 一个收发消息的动作生成2个文件
	err := executeTemplate(ACTION_SENDEVENT_HEADER_TEMPLATE, AUTOGEN_CPP_FOLDER, t.HeaderFileName, t)
	if err != nil {
		return err
	}

	err = executeTemplate(ACTION_SENDEVENT_CPP_TEMPLATE, AUTOGEN_CPP_FOLDER, t.CppFileName, t)
	if err != nil {
		return err
	}

	return nil
}

func (t *ActionSendEvent) FillEventsByRef(eventMap map[string]Event) error {
	e, ok := eventMap[t.Spec.EventRef]
	if !ok {
		return fmt.Errorf("cannot find event by ref %s", t.Spec.EventRef)
	}

	t.Spec.Event = e.(*EventRequest)
	// t.Spec.SendSpec.EventName = e.EventName()

	return nil
}

// func (t *ActionSendEvent) OutputFileNames() []string {
// 	return []string{
// 		fmt.Sprintf("%s.h", t.Metadata.Name),
// 		fmt.Sprintf("%s.cpp", t.Metadata.Name),
// 	}
// }
