#include "app.h"
#include <grpc++/grpc++.h>
#include <fruit/fruit.h>
#include "async_call.h"
#include "connector_manager.h"
#include "robot_manager.h"
#include "connect_async_call.h"
#include "server.h"
#include "robot_setup_async_call.h"
#include "robot_teardown_async_call.h"
#include <autogen_init.h>
#include <boost/log/trivial.hpp>
#include <boost/log/expressions.hpp>
// 这里会变化
#include <video_platform_impl/share/netengine/BiboFrame/BiboInterfaces.h>

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

        // 初始化connect
        createConnectAsyncCall(m_server, m_connectorManager)->proceed();

        // 初始化robot开始与清理的请求handler
        createRobotSetupAsyncCall(m_server, m_robotManager)->proceed();
        createRobotTeardownAsyncCall(m_server, m_robotManager)->proceed();
        
        // 初始化其它一堆自动生成的handler
        initGRPCAsyncCalls(m_server, m_robotManager);

        void* tag;
        bool ok;

        auto now = std::chrono::system_clock::now();
        auto deadline = now;

        while (true) {
            deadline += 100ms;

            // 在deadline前一直从cq里取任务执行，直到时间到为止（100毫秒）。
            // 这里处理的应该都是doReply函数中的逻辑，一般是发消息、保存消息callback等事情。
            while (true) {
                auto nst = m_server.queue().AsyncNext(&tag, &ok, deadline);

                // 此时当前时间应当就是deadline
                m_robotManager.update(deadline);

                if (nst == grpc::CompletionQueue::SHUTDOWN) {
                    // 不应该的情况
                    // TODO log it
                    return 1;
                } else if (nst == grpc::CompletionQueue::GOT_EVENT) {
                    AsyncCall* ac = static_cast<AsyncCall*>(tag);
                    ac->proceed();
                } else if (nst == grpc::CompletionQueue::TIMEOUT) {
                    // 超时，不再从队列里取数据了。
                    break;
                }
            }

            // 处理x51/mgc的消息队列
            // 这里一般是处理实际收到消息后处理callback的逻辑
            m_connectorManager.poll();
        }

        return 0;
    }
private:
    Server& m_server;
    ConnectorManager& m_connectorManager;
    RobotManager& m_robotManager;
};

fruit::Component<App> getApp() {
    return fruit::createComponent()
        .bind<App, AppImpl>()
        .install(getRobotManager)
        .install(getConnectorManager)
        .install(getServerComponent)
    ;
}
