#include "app.h"
#include <grpc++/grpc++.h>
#include <autogen_init.h>
#include <fruit/fruit.h>
#include "async_call.h"
#include "connector_manager.h"
#include "robot_manager.h"
#include "connect_async_call.h"
#include "robot_setup_async_call.h"
#include "robot_teardown_async_call.h"
#include <video_platform_impl/share/netengine/BiboFrame/BiboInterfaces.h>

using namespace std::literals::chrono_literals;

class AppImpl final : public App {
public:
    INJECT(AppImpl(
        ConnectorManager& cm, 
        RobotManager& rm,
        CompletionQueueComponent& cq,
        AsyncService& asrv,
        AsyncCallFactory& acf
    )) : 
        m_connectorManager{cm},
        m_robotManager{rm},
        m_completionQueueComponent{cq},
        m_asyncService{asrv},
        m_asyncCallFactory{acf}
    {}

    int run() {
        // 设置x51的log
        GetLogInterface()->SetSystemPriority(900);

        std::string addr{"0.0.0.0:12345"};

        Broker::AsyncService& broker = &m_asyncService.get();
        
        grpc::ServerBuilder builder;
        builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
        
        builder.RegisterService(&broker);

        // std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();
        m_completionQueueComponent.set(builder.AddCompletionQueue());

        auto server = builder.BuildAndStart();

        // (new ConnectAsyncCall{&broker, cq.get(), m_connectorManager})->proceed();
        m_asyncCallFactory.create<ConnectAsyncCall>()->proceed();
        // (new RobotSetupAsyncCall{&broker, cq.get(), m_robotManager})->proceed();
        m_asyncCallFactory.create<RobotSetupAsyncCall>()->proceed();
        // (new RobotTeardownAsyncCall{&broker, cq.get(), m_robotManager})->proceed();
        m_asyncCallFactory.create<RobotTeardownAsyncCall>()->proceed();

        initGRPCAsyncCalls(&broker, cq.get(), m_robotManager);

        void* tag;
        bool ok;

        auto now = std::chrono::system_clock::now();
        auto deadline = now + 100ms;

        while (true) {
            deadline += 100ms;

            while (true) {
                // 在deadline前一直取，直到时间到为止。
                auto nst = m_completionQueueComponent.get().AsyncNext(&tag, &ok, deadline);

                if (nst == grpc::CompletionQueue::SHUTDOWN) {
                    // 不应该的情况
                    return 1;
                } else if (nst == grpc::CompletionQueue::GOT_EVENT) {
                    AsyncCall* ac = static_cast<AsyncCall*>(tag);
                    ac->proceed();
                } else if (nst == grpc::CompletionQueue::TIMEOUT) {
                    // 超时，不再从队列里取数据了。
                    break;
                }
            }

            m_connectorManager.poll();
        }

        return 0;
    }
private:
    ConnectorManager& m_connectorManager;
    RobotManager& m_robotManager;
    AsyncService& m_asyncService;
    CompletionQueueComponent& m_completionQueueComponent;
    AsyncCallFactory& m_asyncCallFactory;
};

fruit::Component<App> getApp() {
    return fruit::createComponent()
        .bind<App, AppImpl>()
        .install(getRobotManager)
        .install(getConnectorManager)
        .install(getAsyncService)
        .install(getCompletionQueueComponent)
        .install(getAsyncCallFactory)
    ;
}
