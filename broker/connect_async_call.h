#pragma once
#include "async_call_impl.h"

// class ConnectorManager;

// 用于连接服务器的异步操作
class ConnectAsyncCall final : public AsyncCallImpl<ConnectAsyncCall, ConnectParams, Result> {
public:
    // ConnectAsyncCall(
    //     Broker::AsyncService* srv, 
    //     grpc::ServerCompletionQueue* cq, 
    //     ConnectorManager& connectorManager
    // ) : m_srv{srv}, m_cq{cq}, m_responder{&m_ctx}, m_connectorManager{connectorManager} {}

    // ConnectAsyncCall(ConnectAsyncCall&) = delete;
    // ConnectAsyncCall& operator=(ConnectAsyncCall&) = delete;
    using AsyncCallImpl<ConnectAsyncCall, ConnectParams, Result>::AsyncCallImpl;

    // void proceed() override;

protected:
    // void doRequest();

    RequestMethod getRequestMethod() override;

    void doReply() override;
// protected:
//     Broker::AsyncService* m_srv;
//     grpc::ServerCompletionQueue* m_cq;
//     grpc::ServerContext m_ctx;
//     ConnectParams m_request;
//     Result m_reply;
//     grpc::ServerAsyncResponseWriter<Result> m_responder;
//     State m_state{State::CREATE};

//     ConnectorManager& m_connectorManager;
};
