#pragma once
#include "async_call.h"
#include <x51.grpc.pb.h>

class AsyncCallFactory;

// 子类要在doReply里，或者别的什么地方（比如回调）里调用 grpc::ServerAsyncResponseWriter::Finish 方法。
template<typename SubClass, typename ParamType, typename ResultType>
class AsyncCallImpl : public AsyncCall {
public:
    using RequestMethod = void(Broker::AsyncService::*)(grpc::ServerContext*, ParamType*, grpc::ServerAsyncResponseWriter<ResultType>*, grpc::ServerCompletionQueue*, grpc::ServerCompletionQueue*, void*);
public:
    // AsyncCallImpl(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq) : m_srv{srv}, m_cq{cq}, m_responder{&m_ctx} {
        
    // }
    explicit AsyncCallImpl(AsyncCallFactory& factory) : m_factory{factory}, m_responder{&m_ctx} {}

    // void setRobotManager(RobotManager* m) {
    //     this.m_robotManager = m;
    // }

    // void setConnectorManager(ConnectorManager* m) {
    //     this.m_connectorManager = m;
    // }

    AsyncCallImpl(AsyncCallImpl&) = delete;
    AsyncCallImpl& operator=(AsyncCallImpl&) = delete;

    void proceed() override {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;

            doRequest();
        } else if (m_state == State::PROCESS) {
            auto next = m_factory.create<SubClass>();
            next->proceed();

            m_state = State::FINISH;

            doReply();
        } else if (m_state == State::FINISH) {
            delete this;
        } else {
            assert(false);
        }
    }

protected:
    void doRequest() {
        auto cq = &m_factory.getCompletionQueueComponent().get();
        (m_factory.getAsyncService().get().*getRequestMethod())(&m_ctx, &m_request, &m_responder, cq, cq, this);
    }

    virtual RequestMethod getRequestMethod() = 0;

    virtual void doReply() = 0;
protected:
    // Broker::AsyncService* m_srv;
    // grpc::ServerCompletionQueue* m_cq;
    grpc::ServerContext m_ctx;
    
    // 参数和返回值
    ParamType m_request;
    ResultType m_reply;
    grpc::ServerAsyncResponseWriter<ResultType> m_responder;

    State m_state{State::CREATE};
    
    // components
    AsyncCallFactory& m_factory;
    // ConnectorManager* m_connectorManager{};
    // RobotManager* m_robotManager{};
};
