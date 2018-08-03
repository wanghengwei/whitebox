#pragma once
#include "async_call.h"
#include "server.h"
#include <x51.grpc.pb.h>

class AsyncCallFactory;

// 子类要在doReply里，或者别的什么地方（比如回调）里调用 grpc::ServerAsyncResponseWriter::Finish 方法。
// 方便各式各样的子类的辅助父类。子类可能有各种依赖需求，这是在此处无法决定的。比如有的需要依赖connector manager，有的依赖 robot manager。
// 子类的变化点在于：1. 请求的grpc方法不一样；2. 真正处理逻辑的部分不一样。 3. 依赖不太一样
// 每个子类互相没啥关系。生命周期是一个请求的开始等待到执行结束，不长不短。
template<typename SubClass, typename ParamType, typename ReturnType>
class AsyncCallImpl : public AsyncCall {
public:
    using AsyncRequestMethod = void(Broker::AsyncService::*)(grpc::ServerContext*, ParamType*, grpc::ServerAsyncResponseWriter<ReturnType>*, grpc::CompletionQueue*, grpc::ServerCompletionQueue*, void*);
  
public:
    explicit AsyncCallImpl(Server& svr) : m_svr{svr}, m_responder{&m_ctx} {}
        
    // }
    // explicit AsyncCallImpl(AsyncCallFactory& factory) : m_factory{factory}, m_responder{&m_ctx} {}

    // void setRobotManager(RobotManager* m) {
    //     this.m_robotManager = m;
    // }

    // void setConnectorManager(ConnectorManager* m) {
    //     this.m_connectorManager = m;
    // }

    // AsyncCallImpl(AsyncCallImpl&) = delete;
    // AsyncCallImpl& operator=(AsyncCallImpl&) = delete;

    void proceed() override {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;

            doRequest();
        } else if (m_state == State::PROCESS) {
            // 这里需要再生成一个本类型的对象
            // 也就是说，需要保存一个injector 还是 factory 呢？
            auto next = createNewInstance();
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
    const ParamType &request() const { return m_request; }
    ReturnType& reply() { return m_reply; }

    Server& server() { return m_svr; }
    Broker::AsyncService& service() { return m_svr.service(); }
    grpc::ServerCompletionQueue& queue() { return m_svr.queue(); }


    void doRequest() {
        (service().*getRequestMethod())(&m_ctx, &m_request, &m_responder, &queue(), &queue(), this);
    }

    void finish() {
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }

    // 返回grpc 方法
    virtual AsyncRequestMethod getRequestMethod() const = 0;

    // 根据自身属性创建一个新的实例
    virtual AsyncCall* createNewInstance() = 0;

    virtual void doReply() = 0;
private:
    // Broker::AsyncService& m_srv;
    // grpc::ServerCompletionQueue& m_cq;
    Server& m_svr;
    grpc::ServerContext m_ctx;
    
    // 参数和返回值
    ParamType m_request;
    ReturnType m_reply;
    grpc::ServerAsyncResponseWriter<ReturnType> m_responder;

    State m_state{State::CREATE};
    
    // components
    // AsyncCallFactory& m_factory;
    // ConnectorManager* m_connectorManager{};
    // RobotManager* m_robotManager{};
};
