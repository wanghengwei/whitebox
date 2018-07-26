// #define RAPIDJSON_HAS_STDSTRING 1
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>
#include <grpc++/grpc++.h>
#include "async_call.h"

#include <init_grpc_async_calls.h>

int main() {
    std::string addr{"0.0.0.0:12345"};

    ConnectionManager connMgr;

    Broker::AsyncService broker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    builder.RegisterService(&broker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    auto server = builder.BuildAndStart();

    initGRPCAsyncCalls(&broker, cq.get(), connMgr);

    void* tag;
    bool ok;
    while (true) {
        bool opened = cq->Next(&tag, &ok);
        if (!opened) {
            break;
        }
        AsyncCall* ac = static_cast<AsyncCall*>(tag);
        ac->proceed();
    }

    return 0;
}
