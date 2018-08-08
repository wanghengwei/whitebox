import { configure, renderString, render } from 'nunjucks';
import actionManager from './action_manager';

const CMAKELISTS_TEMPLATE = `
add_library(autogen
	{% for file in files %}
	{{ file }}
	{% endfor %}
)
target_link_libraries(autogen proto fmt)
target_include_directories(autogen 
    INTERFACE \${CMAKE_CURRENT_SOURCE_DIR} 
    PRIVATE \${MGC_INCLUDE_DIRS}
)
target_compile_options(autogen
    PUBLIC
        -Wno-deprecated-declarations
)
target_compile_definitions(autogen PUBLIC BOOST_ALL_DYN_LINK)
	
`;

const PROTO_TEMPLATE = `
syntax = "proto3";

import "google/protobuf/empty.proto";

import "common.proto";

service Broker {

    rpc RobotSetup (InitParams) returns (Error);

    rpc RobotTeardown (TeardownParams) returns (Error);
    
    rpc Connect (ConnectParams) returns (Result);

    {% for action in actions %}
    rpc {{ action.fullName() }} (EventRequestParams) returns (Result);
    {% endfor %}
}

`

const AUTOGEN_INIT_TEMPLATE = `
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
    
`

const EVENT_REQUEST_HEADER_TEMPLATE = `
#pragma once
{% for h in event.includeHeaders() %}
#include <{{ h }}>
{% endfor %}
#include <common.pb.h>
#include <boost/lexical_cast.hpp>

class Robot;

void init{{ event.fullName() }}({{ event.doc.spec.eventName }}& ev, const EventRequestParams& request, const Robot& robot);
`

const EVENT_REQUEST_CPP_TEMPLATE = `
#include "{{ event.headerFileName() }}"
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
		BOOST_LOG_TRIVIAL(debug) << "set {{ $eventName }}.{{.Field}} = " << raw;
		try {
			ev.{{.Field}} = {{.CastFunc}}(raw);
		} catch (const boost::bad_lexical_cast& ex) {
			throw boost::enable_error_info(ex) << whitebox::errmsg("value: \"{}\", dstType: {}, raw: {}"_format(raw, {{.ValueType | quote}}, {{.RawValue | quote}}));
		}
	}
	{{ end }}
}
`

configure({});

let res = renderString(CMAKELISTS_TEMPLATE, {
    files: [].concat(actionManager.events.map(x => x.cppFileName()), actionManager.actions.map(x => x.cppFileName())),
});

res = renderString(PROTO_TEMPLATE, { actions: actionManager.actions });

res = renderString(AUTOGEN_INIT_TEMPLATE, { actions: actionManager.actions });

res = renderString(EVENT_REQUEST_HEADER_TEMPLATE, {event: actionManager.events[0]});

console.log(res);
