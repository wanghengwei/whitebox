// #define RAPIDJSON_HAS_STDSTRING 1
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>
#include <grpc++/grpc++.h>
#include <x51.grpc.pb.h>

using namespace x51;

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
    x51::ConnectionIdentity m_request;
    x51::Result m_reply;
    grpc::ServerAsyncResponseWriter<x51::Result> m_responder;
    State m_state{State::CREATE};
    ConnectionManager& m_connMgr;
};

// **variation**
class SendCEventLogin : public AsyncCallImpl<SendCEventLogin> {
public:
    using AsyncCallImpl<SendCEventLogin>::AsyncCallImpl;
protected:
    void doRequest() override {
        m_srv->RequestSendCEventLogin(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    }

    void doReply() override {
        std::string acc = m_request.account();
        std::string srv = m_request.service();
        int idx = m_request.connectionindex();
        auto conn = m_connMgr.findConnection(acc, srv, idx);
        CEventLogin ev;
        ev.m_roomId = 1212;
        conn->sendEvent(&ev);
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};

// **variation**
class RecvCEventLoginRes : public AsyncCallImpl<RecvCEventLoginRes> {
public:
    using AsyncCallImpl<RecvCEventLoginRes>::AsyncCallImpl;
protected:
    void doRequest() override {
        m_srv->RequestRecvCEventLoginRes(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    }

    void doReply() override {
        std::string acc = m_request.account();
        std::string srv = m_request.service();
        int idx = m_request.connectionindex();
        auto conn = m_connMgr.findConnection(acc, srv, idx);
        
        conn->waitEvent([](const CEvent&) {
            return true;
        }, [this]() {
            m_responder.Finish(m_reply, grpc::Status::OK, this);
        });
    }
};

int main() {
    std::string addr{"0.0.0.0:12345"};

    ConnectionManager connMgr;

    Broker::AsyncService broker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    builder.RegisterService(&broker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    auto server = builder.BuildAndStart();

    // **VARIATION**
    (new SendCEventLogin{&broker, cq.get(), connMgr})->proceed();
    (new RecvCEventLoginRes{&broker, cq.get(), connMgr})->proceed();
    // ****

    void* tag;
    bool ok;
    while (true) {
        bool opened = cq->Next(&tag, &ok);
        if (!opened) {
            break;
        }
        AsyncCall* ac = static_cast<AsyncCall*>(tag);
        ac->proceed();
    }

    return 0;
}
