import { configure, renderString, render } from 'nunjucks';
import actionManager, { EventOrder, ActionOrder } from './action_manager';
import { writeFileSync } from 'fs';

const templates = {
    CMAKELISTS_TEMPLATE: `
add_library(autogen
	{% for file in files %}
	{{ file }}
	{% endfor %}
)
target_link_libraries(autogen proto fmt broker_common)
target_include_directories(autogen 
    INTERFACE \${CMAKE_CURRENT_SOURCE_DIR} 
    PRIVATE \${PROJ_INCLUDE_DIRS} \${PROTO_COMMON_INCLUDE_DIR}
)
target_compile_options(autogen
    PUBLIC
        -Wno-deprecated-declarations
)
target_compile_definitions(autogen PUBLIC BOOST_ALL_DYN_LINK)
	
`,

    PROTO_TEMPLATE: `
syntax = "proto3";

import "google/protobuf/empty.proto";

import "common.proto";

service Broker {
    {% for action in actions %}
    rpc {{ action.fullName() }} (EventRequestParams) returns (Result);
    {% endfor %}
}

`,

    AUTOGEN_INIT_TEMPLATE: `
#pragma once
{% for action in actions %}
#include "{{ action.headerFileName() }}"
{% endfor %}

class RobotManager;
class Server;

void initGRPCAsyncCalls(Server& svr, RobotManager& rm) {
    {% for action in actions %}
    create{{ action.fullName() }}(svr, rm)->proceed();
    {% endfor %}
}
    
`,

    EVENT_REQUEST_HEADER_TEMPLATE: `
#pragma once
{% for h in event.includeHeaders() %}
#include <{{ h }}>
{% endfor %}
#include <common.pb.h>
#include <boost/lexical_cast.hpp>

class Robot;

void init{{ event.fullName() }}({{ event.doc.spec.eventName }}& ev, const EventRequestParams& request, const Robot& robot);
`,

    EVENT_REQUEST_CPP_TEMPLATE: `
#include "{{ event.headerFileName() }}"
#include <robot.h>
#include <errors.h>
#include <boost/exception/all.hpp>
#include <fmt/format.h>
#include <boost/log/trivial.hpp>

using namespace fmt::literals;

{% set eventName = event.doc.spec.eventName %}

void init{{ event.fullName() }}({{ eventName }}& ev, const EventRequestParams& request, const Robot& robot) {
	{% for param in event.params() %}
	{
        {% set value = param.value %}
		auto raw = {{ value.expression() }};
		BOOST_LOG_TRIVIAL(debug) << "set {{ eventName }}.{{ param.field }} = " << raw;
		try {
			ev.{{ param.field }} = {{ param.value.castFunc() }}(raw);
		} catch (const boost::bad_lexical_cast& ex) {
			throw boost::enable_error_info(ex) << whitebox::errmsg("value: \\"{}\\", dstType: {}, raw: {}"_format(raw, {{ stringify(param.type) }}, {{ stringify(value.expression()) }}));
        }
	}
	{% endfor %}
}

`
    ,

    EVENT_RESPONSE_HEADER_TEMPLATE: `
#pragma once
{% for h in event.includeHeaders() %}
#include <{{ h }}>
{% endfor %}
#include <common.pb.h>

void fillReplyBy{{ event.fullName() }}(const {{ event.doc.spec.eventName }}& ev, Result& reply);
`
    ,
    EVENT_RESPONSE_CPP_TEMPLATE: `
#include "{{ event.headerFileName() }}"
#include <boost/lexical_cast.hpp>

void fillReplyBy{{ event.fullName() }}(const {{ event.eventName() }}& ev, Result& reply) {
	auto ec = ev.{{ event.doc.spec.errorCodeField }};
	if (ec != 0) {
		auto err = reply.mutable_error();
		err->set_errorcode(ec);
		err->set_errorcategory("{{event.doc.spec.errorCategory}}");
		return;
	}
	auto d = reply.mutable_data()->mutable_data();
	{% for r in event.doc.spec.results %}
	(*d)["{{ r.field }}"] = boost::lexical_cast<std::string>(ev.{{r.field}});
	{% endfor %}
}
`
    ,

    ACTION_SENDRECVEVENT_HEADER_TEMPLATE: `
#pragma once

#include <async_call.h>

class RobotManager;
class Server;

AsyncCall* create{{ action.fullName() }}(Server&, RobotManager&);
`
    ,
    ACTION_SENDRECVEVENT_CPP_TEMPLATE: `
{% for h in action.doc.metadata.include_headers %}
#include <{{h}}>
{% endfor %}

{% set sendEvent = action.sendEvent() %}

#include "{{action.headerFileName()}}"
#include "{{sendEvent.headerFileName()}}"
{% for a in action.recvEvents() %}
#include "{{ a.headerFileName() }}"
{% endfor %}

#include <async_call_impl.h>
#include <robot_manager.h>
#include <robot.h>
#include <connection.h>
#include <errors.h>
#include <fmt/format.h>
#include <broker.grpc.pb.h>

using namespace fmt::literals;

{% set className = action.fullName() %}

class {{ className }} : public AsyncCallImpl<{{ className }}, EventRequestParams, Result, Broker> {
public:
	{{ className }}(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}
protected:
	AsyncRequestMethod getRequestMethod() const override {
		return &::Broker::AsyncService::Request{{ className }};
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
				{{ sendEvent.eventName() }} ev;
				try {
					init{{sendEvent.fullName()}}(ev, request(), *robot);
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

				conn->sendEvent(&ev);

				conn->waitEvent([](IEvent* ev) {
					{% for recvEvent in action.recvEvents() %}
					if (ev->GetCLSID() == {{ recvEvent.eventName() }}::_GetCLSID()) {
						return {{ loop.index0 }};
					}
					{% endfor %}
					return -1;
				}, [this](int matchedEventIndex, IEvent* ev) {
					{% for recvEvent in action.recvEvents() %}
					if (matchedEventIndex == {{ loop.index0 }}) {
						fillReplyBy{{ recvEvent.fullName() }}(*({{ recvEvent.eventName() }}*)ev, reply());
						finish();
						return;
					}
					{% endfor %}

					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::TIMEOUT);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					e->set_message("action %s timeout"_format("{{ action.fullName() }}"));
					finish();
				});

				return;
			}
		}
		finish();
	}

	AsyncCall* createNewInstance() override {
		return create{{ className }}(server(), m_robotManager);
	}
private:
	RobotManager& m_robotManager;
};

AsyncCall* create{{className}}(Server& svr, RobotManager& rm) {
	return new {{ className }}{svr, rm};
}
	
`
    ,

    ACTION_SENDEVENT_HEADER_TEMPLATE: `
#pragma once

#include <async_call.h>

class RobotManager;
class Server;

AsyncCall* create{{ action.fullName() }}(Server&, RobotManager&);
`
    ,
    ACTION_SENDEVENT_CPP_TEMPLATE: `
{% for h in action.doc.metadata.include_headers %}
#include <{{ h }}>
{% endfor %}

#include "{{ action.headerFileName() }}"
#include "{{ action.event().headerFileName() }}"

#include <async_call_impl.h>
#include <robot_manager.h>
#include <robot.h>
#include <connection.h>
#include <errors.h>
#include <fmt/format.h>
#include <broker.grpc.pb.h>

using namespace fmt::literals;

{% set className = action.fullName() %}

class {{ className }} : public AsyncCallImpl<{{ className }}, EventRequestParams, Result, Broker> {
public:
	{{ className }}(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}
protected:
	AsyncRequestMethod getRequestMethod() const override {
		return &::Broker::AsyncService::Request{{ className }};
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
				{{ action.event().eventName() }} ev;
				try {
					init{{ action.event().fullName() }}(ev, request(), *robot);
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
		return create{{ className }}(server(), m_robotManager);
	}
private:
	RobotManager& m_robotManager;
};

AsyncCall* create{{ className }}(Server& svr, RobotManager& rm) {
	return new {{ className }}{svr, rm};
}
	
`
,

ACTION_RECVEVENT_HEADER_TEMPLATE: `
#pragma once

#include <async_call.h>

class RobotManager;
class Server;

AsyncCall* create{{ action.fullName()}}(Server&, RobotManager&);
	`
,
	ACTION_RECVEVENT_CPP_TEMPLATE: `
{% for h in action.doc.spec.metadata.include_headers %}
#include <{{ h }}>
{% endfor %}

#include "{{action.headerFileName()}}"
{% for e in action.events() %}
#include "{{ e.headerFileName() }}"
{% endfor %}

#include <async_call_impl.h>
#include <robot_manager.h>
#include <robot.h>
#include <connection.h>
#include <errors.h>
#include <fmt/format.h>
#include <broker.grpc.pb.h>

using namespace fmt::literals;

{% set className = action.fullName() %}

class {{ className }} : public AsyncCallImpl<{{ className }}, EventRequestParams, Result, Broker> {
public:
	{{ className }}(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}
protected:
	AsyncRequestMethod getRequestMethod() const override {
		return &::Broker::AsyncService::Request{{ className }};
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
					{% for e in action.events() %}
					if (ev->GetCLSID() == {{ e.eventName() }}::_GetCLSID()) {
						return {{ loop.index0 }};
					}
					{% endfor %}
					return -1;
				}, [this](int matchedEventIndex, IEvent* ev) {
					{% for e in action.events() %}
					if (matchedEventIndex == {{ loop.index0 }}) {
						fillReplyBy{{ e.fullName() }}(*({{ e.eventName() }}*)ev, reply());
						finish();
						return;
					}
					{% endfor %}

					auto e = reply().mutable_error();
					e->set_errorcode((int)whitebox::errc::TIMEOUT);
					e->set_errorcategory(whitebox::ERROR_CATEGORY);
					e->set_message("action {} timeout"_format("{{ action.fullName() }}"));
					finish();
				});

				return;
			}
		}
		finish();
	}

	AsyncCall* createNewInstance() override {
		return create{{ className }}(server(), m_robotManager);
	}
private:
	RobotManager& m_robotManager;
};

AsyncCall* create{{ className }}(Server& svr, RobotManager& rm) {
	return new {{ className }}{svr, rm};
}
	
    `
    ,
};

configure({ autoescape: false });

function renderToFile(tpl: string, ctx: any, path: string) {
    let s = renderString(tpl, ctx);
    writeFileSync(path, s);
}

renderToFile(templates.CMAKELISTS_TEMPLATE, {
    files: [].concat(actionManager.events.map(x => x.cppFileName()), actionManager.actions.map(x => x.cppFileName())),
}, "../mgc/autogen/CMakeLists.txt");

renderToFile(templates.PROTO_TEMPLATE, { actions: actionManager.actions }, "../mgc/protos/broker.proto");

renderToFile(templates.AUTOGEN_INIT_TEMPLATE, { actions: actionManager.actions }, "../mgc/autogen/autogen_init.h");

for (const e of actionManager.events) {
    renderToFile(templates[`EVENT_${e.order().toUpperCase()}_HEADER_TEMPLATE`], { event: e }, `../mgc/autogen/${e.headerFileName()}`);
    renderToFile(templates[`EVENT_${e.order().toUpperCase()}_CPP_TEMPLATE`], { event: e, stringify: JSON.stringify }, `../mgc/autogen/${e.cppFileName()}`);
}

for (const act of actionManager.actions) {
    renderToFile(templates[`ACTION_${act.order().toUpperCase()}_HEADER_TEMPLATE`], { action: act }, `../mgc/autogen/${act.headerFileName()}`);
    renderToFile(templates[`ACTION_${act.order().toUpperCase()}_CPP_TEMPLATE`], { action: act }, `../mgc/autogen/${act.cppFileName()}`);

}
