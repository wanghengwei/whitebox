#pragma once

#include <x51.grpc.pb.h>
#include "../async_call.h"

class RobotManager;

void process{{.Metadata.Name}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm);