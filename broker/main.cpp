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

class BasicAsyncCall {
public:
    virtual ~BasicAsyncCall() {}

    virtual void proceed() = 0;
};

template<typename C>
class AsyncCall : public BasicAsyncCall {
private:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    AsyncCall(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) : m_srv{srv}, m_cq{cq}, m_connMgr{cm}, m_responder{&m_ctx} {
        // proceed();
    }

    virtual ~AsyncCall() {
        std::clog << "~AsyncCall()\n";
    }

    AsyncCall(AsyncCall&) = delete;
    AsyncCall& operator=(AsyncCall&) = delete;

    virtual void doRequest() = 0;
    virtual void doReply(std::shared_ptr<Connection>) = 0;

    void proceed() override {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;

            // !!!
            // m_srv->RequestRecvCEventLoginRes(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this); // <AUTOGEN>
            doRequest();
        } else if (m_state == State::PROCESS) {
            (new C{m_srv, m_cq, m_connMgr})->proceed();

            std::string acc = m_request.account();
            std::string srv = m_request.service();
            int idx = m_request.connectionindex();
            auto conn = m_connMgr.findConnection(acc, srv, idx);
            m_state = State::FINISH;

            // !!!
            // conn->waitEvent([](const CEvent&) {
            //     return true;
            // }, [this]() {
            //     m_responder.Finish(m_reply, grpc::Status::OK, this);
            // }); // <AUTOGEN>
            doReply(conn);
        } else if (m_state == State::FINISH) {
            delete this;
        } else {
            assert(false);
        }
    }
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

class SendCEventLogin : public AsyncCall<SendCEventLogin> {
public:
    using AsyncCall<SendCEventLogin>::AsyncCall;

    void doRequest() override {
        m_srv->RequestSendCEventLogin(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    }

    void doReply(std::shared_ptr<Connection> conn) override {
        CEventLogin ev;
        ev.m_roomId = 1212;
        conn->sendEvent(&ev);
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};

int main() {
    std::string addr{"0.0.0.0:12345"};

    ConnectionManager connMgr;

    // BrokerImpl sendBroker{connMgr};
    Broker::AsyncService recvBroker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    // builder.RegisterService(&sendBroker);
    builder.RegisterService(&recvBroker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    // std::clog << "cq is " << cq.get() << '\n';

    auto server = builder.BuildAndStart();

    // spawn async request handlers
    // spawnRecvHandlers(recvBroker);
    (new SendCEventLogin{&recvBroker, cq.get(), connMgr})->proceed();

    void* tag;
    bool ok;
    while (true) {
        bool opened = cq->Next(&tag, &ok);
        if (!opened) {
            break;
        }
        BasicAsyncCall* ac = static_cast<BasicAsyncCall*>(tag);
        ac->proceed();
    }

    return 0;
}