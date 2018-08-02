#include "robot_teardown_async_call.h"
#include "robot_manager.h"

RequestMethod RobotTeardownAsyncCall::getRequestMethod() {
    // m_srv->RequestRobotTeardown(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    return &::Broker::AsyncService::RequestRobotTeardown;
}

void RobotTeardownAsyncCall::doReply() {
    // 删除一个robot
    auto acc = m_request.account();

    m_robotManager->teardownRobot(acc);

    m_responder.Finish(m_reply, grpc::Status::OK, this);
}