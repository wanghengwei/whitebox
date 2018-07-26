#pragma once

#include <x51.grpc.pb.h>
#include "../async_call.h"

void process{{.Spec.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm);