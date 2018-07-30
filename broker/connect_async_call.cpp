#include "connect_async_call.h"
#include "connector_manager.h"
#include "errors.h"
#include "connector.h"
#include <boost/log/trivial.hpp>

void ConnectAsyncCall::proceed() {
    if (m_state == State::CREATE) {
        m_state = State::PROCESS;

        doRequest();
    } else if (m_state == State::PROCESS) {
        (new ConnectAsyncCall{m_srv, m_cq, m_connMgr, m_connectorManager})->proceed();

        m_state = State::FINISH;

        doReply();
    } else if (m_state == State::FINISH) {
        delete this;
    } else {
        assert(false);
    }
}

void ConnectAsyncCall::doRequest() {
    m_srv->RequestConnect(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
}

void ConnectAsyncCall::doReply() {
    std::string addr = m_request.address();
    uint16_t port = m_request.port();
    auto connId = m_request.connectionid();
    std::string pass = m_request.password();

    BOOST_LOG_TRIVIAL(info) << "find connector for " << connId.service();

    // 真正发起连接。需要找到对应服务的Connector
    auto connector = m_connectorManager.findConnector(connId.service());
    if (!connector) {
        // 没有找到服务，无法连接

        BOOST_LOG_TRIVIAL(warning) << "no connector for " << connId.service();

        auto e = m_reply.mutable_error();
        e->set_errorcode(int(whitebox::errc::CONNECT_FAILED));
        e->set_errorcategory(whitebox::ERROR_CATEGORY);
        m_responder.Finish(m_reply, grpc::Status::OK, this);

        return;
    }

    // 找到connector了，开始发起连接
    BOOST_LOG_TRIVIAL(info) << "begin connect: addr=" << addr << ", port=" << port << ", acc=" << connId.account();

    connector->connect(addr, port, connId.account(), pass);
}
