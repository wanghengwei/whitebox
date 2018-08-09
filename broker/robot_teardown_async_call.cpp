#include "robot_teardown_async_call.h"
#include "async_call_impl.h"
#include "robot_manager.h"
// #include <boost/log/trivial.hpp>

class RobotTeardownAsyncCall final : public AsyncCallImpl<RobotTeardownAsyncCall, TeardownParams, Error> {
public:
    RobotTeardownAsyncCall(Server& svr, RobotManager& rm) : AsyncCallImpl{svr}, m_robotManager{rm} {}

    AsyncRequestMethod getRequestMethod() const override {
        return &::CommonService::AsyncService::RequestRobotTeardown;
    }

    void doReply() override {
        // 删除一个robot
        auto acc = request().account();

        // BOOST_LOG_TRIVIAL(info) << "teardown a robot: account=" << acc;
        
        m_robotManager.teardownRobot(acc);

        // m_responder.Finish(m_reply, grpc::Status::OK, this);
        finish();
    }

    AsyncCall* createNewInstance() override {
        return createRobotTeardownAsyncCall(server(), m_robotManager);
    }
private:
    RobotManager& m_robotManager;
};





AsyncCall* createRobotTeardownAsyncCall(Server& svr, RobotManager& rm) {
    return new RobotTeardownAsyncCall{svr, rm};
}