#include "app.h"
#include <grpc++/grpc++.h>
#include <autogen_init.h>
#include <fruit/fruit.h>
#include "async_call.h"
#include "connector_manager.h"
#include "robot_manager.h"
#include "connect_async_call.h"
#include "server.h"
#include "robot_setup_async_call.h"
#include "robot_teardown_async_call.h"
#include <video_platform_impl/share/netengine/BiboFrame/BiboInterfaces.h>
#include <boost/log/trivial.hpp>
#include <boost/log/expressions.hpp>

using namespace std::literals::chrono_literals;

class AppImpl final : public App {
public:
    INJECT(AppImpl(
        ConnectorManager& cm, 
        RobotManager& rm,
        Server& svr
    )) : 
        m_connectorManager{cm},
        m_robotManager{rm},
        m_server{svr}
    {}

    int run() {
        // 设置x51的log
        // static const std::map<std::string, int> x51LevelMap = {
        //     {"Debug2", 900},
        //     {"Debug", 800},
        //     {"Info", 700},
        //     {"Error", 400},
        //     {"Critical", 300},
        //     {"Fatal", 200}
        // };
        GetLogInterface()->SetSystemPriority(700);
        boost::log::core::get()->set_filter(
            boost::log::trivial::severity >= boost::log::trivial::info
        );

        m_server.start();

        // 初始化 connect 的injector并生成 factory
        createConnectAsyncCall(m_server, m_connectorManager)->proceed();

        createRobotSetupAsyncCall(m_server, m_robotManager)->proceed();
        createRobotTeardownAsyncCall(m_server, m_robotManager)->proceed();
        
        // m_asyncCallFactory.create<RobotTeardownAsyncCall>()->proceed();

        initGRPCAsyncCalls(m_server, m_robotManager);

        void* tag;
        bool ok;

        auto now = std::chrono::system_clock::now();
        auto deadline = now + 100ms;

        while (true) {
            deadline += 100ms;

            while (true) {
                // 在deadline前一直取，直到时间到为止。
                auto nst = m_server.queue().AsyncNext(&tag, &ok, deadline);

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
    Server& m_server;
    ConnectorManager& m_connectorManager;
    RobotManager& m_robotManager;
    // AsyncService& m_asyncService;
    // CompletionQueueComponent& m_completionQueueComponent;
    // AsyncCallFactory& m_asyncCallFactory;
};

fruit::Component<App> getApp() {
    return fruit::createComponent()
        .bind<App, AppImpl>()
        .install(getRobotManager)
        .install(getConnectorManager)
        .install(getServerComponent)
        // .install(getAsyncService)
        // .install(getCompletionQueueComponent)
        // .install(getAsyncCallFactory)
    ;
}
