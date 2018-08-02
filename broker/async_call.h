#pragma once
#include <functional>
#include <memory>
#include <x51.grpc.pb.h>

// class Connection;
class RobotManager;

// class ConnectionManager {
// public:
//     std::shared_ptr<Connection> findConnection(const std::string& acc, const std::string& srvName, int connIdx) {
//         return this->conn;        
//     }
// private:
//     std::shared_ptr<Connection> conn{new Connection};
// };

class AsyncCall {
public:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    virtual ~AsyncCall() {}
    virtual void proceed() = 0;
};

// 子类要在doReply里，或者别的什么地方（比如回调）里调用 grpc::ServerAsyncResponseWriter::Finish 方法。
template<typename SubClass, typename ParamType, typename ResultType>
class AsyncCallImpl : public AsyncCall {
public:
    AsyncCallImpl(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm) : m_srv{srv}, m_cq{cq}, m_robotManager{cm}, m_responder{&m_ctx} {
        
    }

    AsyncCallImpl(AsyncCallImpl&) = delete;
    AsyncCallImpl& operator=(AsyncCallImpl&) = delete;

    void proceed() override {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;

            doRequest();
        } else if (m_state == State::PROCESS) {
            (new SubClass{m_srv, m_cq, m_robotManager})->proceed();

            m_state = State::FINISH;

            doReply();
        } else if (m_state == State::FINISH) {
            delete this;
        } else {
            assert(false);
        }
    }

protected:
    virtual void doRequest() = 0;
    virtual void doReply() = 0;
protected:
    Broker::AsyncService* m_srv;
    grpc::ServerCompletionQueue* m_cq;
    grpc::ServerContext m_ctx;
    // ConnectionIdentity m_request;
    ParamType m_request;
    ResultType m_reply;
    grpc::ServerAsyncResponseWriter<ResultType> m_responder;
    State m_state{State::CREATE};
    // ConnectionManager& m_connMgr;
    RobotManager& m_robotManager;
};
