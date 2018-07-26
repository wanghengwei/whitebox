#pragma once
{{range .}}
#include "{{.Spec.EventName}}.h"
{{end}}

void initGRPCAsyncCalls(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) {
    {{range .}}
    process{{.Spec.EventName}}(srv, cq, cm);
    {{end}}
}
