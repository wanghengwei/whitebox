#pragma once
{{range .}}
#include "{{.Spec.EventName}}.h"
{{end}}

class RobotManager;

void initGRPCAsyncCalls(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& rm) {
    {{range .}}
    process{{.Spec.EventName}}(srv, cq, rm);
    {{end}}
}

{{range .}}
extern int fun_{{.Spec.EventName}}_no_use();
{{end}}

void initAllEventRegister() {
{{range .}}
fun_{{.Spec.EventName}}_no_use();
{{end}}
}
