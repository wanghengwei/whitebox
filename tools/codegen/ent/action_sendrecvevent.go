package ent

const (
	ACTION_SENDRECVEVENT_HEADER_TEMPLATE = `
#pragma once

#include <x51.grpc.pb.h>
#include "../async_call.h"

class RobotManager;

void process{{.Metadata.FullName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm);
	`

	ACTION_SENDRECVEVENT_CPP_TEMPLATE = `
{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{.HeaderFileName}}"

#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>

using namespace fmt::literals;

class {{.Metadata.FullName}} : public AsyncCallImpl<{{.Metadata.FullName}}> {
public:
	using AsyncCallImpl<{{.Metadata.FullName}}>::AsyncCallImpl;
protected:
	void doRequest() override {
		m_srv->Request{{.Metadata.FullName}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
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

type ActionSendRecvEvent struct {
	Metadata Metadata `yaml:"metadata"`
	Spec     struct {
		SendSpec struct {
			EventRef  string `yaml:"eventRef"`
			EventName string
		} `yaml:"send"`
		RecvSpec struct {
			EventRefs  []string `yaml:"eventRefs"`
			EventNames []string
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

// func (t *ActionSendRecvEvent) OutputFileNames() []string {
// 	return []string{
// 		fmt.Sprintf("%s.h", t.Metadata.Name),
// 		fmt.Sprintf("%s.cpp", t.Metadata.Name),
// 	}
// }
