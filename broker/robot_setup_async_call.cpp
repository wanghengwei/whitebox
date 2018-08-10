#include "robot_setup_async_call.h"
#include "async_call_impl.h"
#include "robot_manager.h"
#include "server.h"
#include <boost/log/trivial.hpp>
#include <fmt/format.h>
#include <common.grpc.pb.h>
using namespace fmt::literals;

class RobotSetupAsyncCall final : public AsyncCallImpl<RobotSetupAsyncCall, InitParams, Error, CommonService> {
public:
    RobotSetupAsyncCall(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}

    AsyncRequestMethod getRequestMethod() const override {
        return &::CommonService::AsyncService::RequestRobotSetup;
    }
    
    void doReply() override {
        // 初始化一个robot，主要是一些初始属性
        auto acc = request().account();
        auto props = request().playerdata();

        std::map<std::string, std::string> m{props.begin(), props.end()};

        

        m_robotManager.setupRobot(acc, std::move(m));

        // m_responder.Finish(m_reply, grpc::Status::OK, this);
        finish();
    }

    AsyncCall* createNewInstance() override {
        return createRobotSetupAsyncCall(server(), m_robotManager);
    }

private:
    RobotManager& m_robotManager;
};

AsyncCall* createRobotSetupAsyncCall(Server& svr, RobotManager& rm) {
    return new RobotSetupAsyncCall{svr, rm};
}
