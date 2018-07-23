#pragma once
#include <functional>
#include <memory>
#include <x51.grpc.pb.h>

class CEvent {
public:
    virtual ~CEvent() {}
};

class CEventLogin : public CEvent {
public:
    int m_roomId;
};

class Connection {
public:
    void sendEvent(CEvent* ev) {}
    void waitEvent(std::function<bool(const CEvent&)> cond, std::function<void()> cb) {
        if (cond) {
            cb();
        }
    }
};

class ConnectionManager {
public:
    std::shared_ptr<Connection> findConnection(const std::string& acc, const std::string& srvName, int connIdx) {
        return this->conn;        
    }
private:
    std::shared_ptr<Connection> conn{new Connection};
};

class AsyncCall {
public:
    virtual ~AsyncCall() {}
    virtual void proceed() = 0;
};

template<typename SubClass>
class AsyncCallImpl : public AsyncCall {
private:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    AsyncCallImpl(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) : m_srv{srv}, m_cq{cq}, m_connMgr{cm}, m_responder{&m_ctx} {
        
    }

    AsyncCallImpl(AsyncCallImpl&) = delete;
    AsyncCallImpl& operator=(AsyncCallImpl&) = delete;

    void proceed() override {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;

            doRequest();
        } else if (m_state == State::PROCESS) {
            (new SubClass{m_srv, m_cq, m_connMgr})->proceed();

            std::string acc = m_request.account();
            std::string srv = m_request.service();
            int idx = m_request.connectionindex();
            auto conn = m_connMgr.findConnection(acc, srv, idx);
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
    ConnectionIdentity m_request;
    Result m_reply;
    grpc::ServerAsyncResponseWriter<Result> m_responder;
    State m_state{State::CREATE};
    ConnectionManager& m_connMgr;
};