#pragma once
#include "async_call.h"

class ConnectorManager;

// 用于连接服务器的异步操作
class ConnectAsyncCall final : public AsyncCall {
public:
    ConnectAsyncCall(
        Broker::AsyncService* srv, 
        grpc::ServerCompletionQueue* cq, 
        ConnectionManager& cm,
        ConnectorManager& connectorManager
    ) : m_srv{srv}, m_cq{cq}, m_connMgr{cm}, m_responder{&m_ctx}, m_connectorManager{connectorManager} {}

    ConnectAsyncCall(ConnectAsyncCall&) = delete;
    ConnectAsyncCall& operator=(ConnectAsyncCall&) = delete;

    void proceed() override;

protected:
    void doRequest();

    void doReply();
protected:
    Broker::AsyncService* m_srv;
    grpc::ServerCompletionQueue* m_cq;
    grpc::ServerContext m_ctx;
    ConnectParams m_request;
    Result m_reply;
    grpc::ServerAsyncResponseWriter<Result> m_responder;
    State m_state{State::CREATE};
    ConnectionManager& m_connMgr;

    ConnectorManager& m_connectorManager;
};
