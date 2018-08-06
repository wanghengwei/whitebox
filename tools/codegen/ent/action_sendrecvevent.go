package ent

import "fmt"

const (
	ACTION_SENDRECVEVENT_HEADER_TEMPLATE = `
#pragma once

#include "../async_call.h"

class RobotManager;
class Server;

AsyncCall* create{{.Metadata.FullName}}(Server&, RobotManager&);
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

#include "../async_call_impl.h"
#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>
#include <x51.grpc.pb.h>

{{ if .Spec.SendSpec.RoomProxyWrap }}
#include <include/video_client_interface.h>
#include <video_platform_impl/common/event/room_proxy_wrap_events.h>
{{ end }}

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

		auto robot = m_robotManager.findRobot(acc);
		if (!robot) {
			auto e = reply().mutable_error();
			e->set_errorcode((int)whitebox::errc::CANNOT_FIND_ROBOT);
			e->set_errorcategory(whitebox::ERROR_CATEGORY);
			e->set_message("cannot find robot: acc={}"_format(acc));
		} else {
			auto conn = robot->findConnection(srv, idx);
			if (!conn) {
				auto e = reply().mutable_error();
				e->set_errorcode((int)whitebox::errc::CANNOT_FIND_CONNECTION);
				e->set_errorcategory(whitebox::ERROR_CATEGORY);
				e->set_message("cannot find connection: acc={}, srv={}, idx={}"_format(acc, srv, idx));
			} else {
				{{.Spec.SendSpec.Event.Spec.EventName}} ev;
				try {
					init{{.Spec.SendSpec.Event.Metadata.FullName}}(ev, request(), *robot);
				} catch (const boost::bad_lexical_cast& ex) {
					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::BAD_CAST);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					if (const std::string* info = boost::get_error_info<whitebox::errmsg>(ex)) {
						e->set_message(*info);
					}
					finish();
					return;
				}

				{{ if .Spec.SendSpec.RoomProxyWrap }}
					static int roomProxyWrappedEventSerialId = 0;
					static const int CLIENT_VERSION = 
						VIDEO_CLIENT_VERSION_MAJAR << 24 |
						VIDEO_CLIENT_VERSION_MINOR << 16 |
						VIDEO_CLIENT_VERSION_REVISION << 8 |
						VIDEO_CLIENT_VERSION_BUILD;
					CEventRoomProxyWrapEvent wrap_evt;
					wrap_evt.AttachEvent(&ev);
					wrap_evt.serialID = ++roomProxyWrappedEventSerialId;
					wrap_evt.client_version = CLIENT_VERSION;
					conn->sendEvent(&wrap_evt);
				{{ else }}
					conn->sendEvent(&ev);
				{{ end }}

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
						fillReplyBy{{ $e.Metadata.FullName }}(*({{$e.Spec.EventName}}*)ev, reply());
						finish();
						return;
					}
					{{end}}

					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::TIMEOUT);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					e->set_message("action %s timeout"_format("{{.Metadata.FullName}}"));
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

type ActionSendRecvEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		SendSpec struct {
			EventRef      string `yaml:"eventRef"`
			Event         *EventRequest
			RoomProxyWrap bool `yaml:"roomProxyWrap"` // 发送消息是否wrap。mgc会用到。默认应该不wrap
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

func NewActionSendRecvEvent() *ActionSendRecvEvent {
	r := &ActionSendRecvEvent{}
	r.Spec.SendSpec.RoomProxyWrap = false

	return r
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
