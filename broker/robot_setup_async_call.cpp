#include "robot_setup_async_call.h"
#include "robot_manager.h"

void RobotSetupAsyncCall::doRequest() {
    m_srv->RequestRobotSetup(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
}

void RobotSetupAsyncCall::doReply() {
    // 初始化一个robot，主要是一些初始属性
    auto acc = m_request.account();
    auto props = m_request.properties();

    std::map<std::string, std::string> m{props.begin(), props.end()};

    m_robotManager.setupRobot(acc, std::move(m));

    m_responder.Finish(m_reply, grpc::Status::OK, this);
}