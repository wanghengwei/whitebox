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
