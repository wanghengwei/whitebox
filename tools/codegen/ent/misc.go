package ent

const (
	CMAKELISTS_TEMPLATE = `
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
	target_compile_definitions(autogen PUBLIC BOOST_ALL_DYN_LINK)
	
`

	PROTO_TEMPLATE = `
syntax = "proto3";

import "google/protobuf/empty.proto";

import "common.proto";

service Broker {

	rpc RobotSetup (InitParams) returns (Error);

	rpc RobotTeardown (TeardownParams) returns (Error);
    
    rpc Connect (ConnectParams) returns (Result);

    {{range .}}
    rpc {{.Metadata.FullName}} (EventRequestParams) returns (Result);
    {{end}}
}

	`

	AUTOGEN_INIT_TEMPLATE = `
	#pragma once
	{{range .}}
	#include "{{.HeaderFileName}}"
	{{end}}
	
	class RobotManager;
	class Server;
	
	void initGRPCAsyncCalls(Server& svr, RobotManager& rm) {
		{{range .}}
		create{{.Metadata.FullName}}(svr, rm)->proceed();
		{{end}}
	}
		
	`
)
