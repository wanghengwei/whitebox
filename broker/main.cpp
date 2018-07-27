// #define RAPIDJSON_HAS_STDSTRING 1
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>
#include <grpc++/grpc++.h>
#include "async_call.h"

#include <init_grpc_async_calls.h>

#include "connector_manager.h"
#include "connect_async_call.h"

#include <fruit/fruit.h>

using namespace std::literals::chrono_literals;

int main() {
    std::string addr{"0.0.0.0:12345"};

    ConnectionManager connMgr;

    Broker::AsyncService broker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    builder.RegisterService(&broker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    auto server = builder.BuildAndStart();

    fruit::Injector<ConnectorManager> injector{getConnectorManager};
    ConnectorManager* connectorManager = injector.get<ConnectorManager*>();

    (new ConnectAsyncCall{&broker, cq.get(), connMgr, *connectorManager})->proceed();
    initGRPCAsyncCalls(&broker, cq.get(), connMgr);


    void* tag;
    bool ok;

    auto now = std::chrono::system_clock::now();
    auto deadline = now + 100ms;

    while (true) {

        auto nst = cq->AsyncNext(&tag, &ok, deadline);
        
        deadline += 100ms;

        if (nst == grpc::CompletionQueue::SHUTDOWN) {
            break;
        } else if (nst == grpc::CompletionQueue::GOT_EVENT) {
            AsyncCall* ac = static_cast<AsyncCall*>(tag);
            ac->proceed();
        } else if (nst == grpc::CompletionQueue::TIMEOUT) {
            
        }

        connectorManager->poll();
    }

    return 0;
}
