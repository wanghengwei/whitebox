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

class SendBrokerImpl : public SendBroker::Service {
public:
    SendBrokerImpl(ConnectionManager& mgr) : m_connMgr{mgr} {}

    ::grpc::Status SendCEventLogin(::grpc::ServerContext* context, const ::x51::SendEventParams* request, ::x51::Result* response) override {
        // response->set_ok(true);
        // response->set_category("");
        auto acc = request->conn().account();
        auto srvName =request->conn().service();
        auto connIdx = request->conn().connectionindex();
        std::string params = request->params();
        rapidjson::Document doc;
        doc.Parse(params.c_str());

        auto conn = m_connMgr.findConnection(acc, srvName, connIdx);

        CEventLogin ev;

        ev.m_roomId = rapidjson::GetValueByPointer(doc, "/roomId")->GetInt();

        std::clog << "Send CEventLogin: roomId=" << ev.m_roomId << '\n';

        conn->sendEvent(&ev);
        return grpc::Status::OK;
    }
private:
    ConnectionManager& m_connMgr;
};

class AsyncCall {
private:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    AsyncCall(RecvBroker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) : m_srv{srv}, m_cq{cq}, m_connMgr{cm}, m_responder{&m_ctx} {
        proceed();
    }

    ~AsyncCall() {
        std::clog << "~AsyncCall()\n";
    }

    AsyncCall(AsyncCall&) = delete;
    AsyncCall& operator=(AsyncCall&) = delete;

    void proceed() {
        if (m_state == State::CREATE) {
            m_state = State::PROCESS;
            m_srv->RequestRecvCEventLoginRes(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this); // <AUTOGEN>
        } else if (m_state == State::PROCESS) {
            new AsyncCall{m_srv, m_cq, m_connMgr};

            std::string acc = m_request.account();
            std::string srv = m_request.service();
            int idx = m_request.connectionindex();
            auto conn = m_connMgr.findConnection(acc, srv, idx);
            m_state = State::FINISH;
            conn->waitEvent([](const CEvent&) {
                return true;
            }, [this]() {
                m_responder.Finish(m_reply, grpc::Status::OK, this);
            }); // <AUTOGEN>
        } else if (m_state == State::FINISH) {
            delete this;
        } else {
            assert(false);
        }
    }
private:
    RecvBroker::AsyncService* m_srv;
    grpc::ServerCompletionQueue* m_cq;
    grpc::ServerContext m_ctx;
    x51::ConnectionIdentity m_request;
    x51::Result m_reply;
    grpc::ServerAsyncResponseWriter<x51::Result> m_responder;
    State m_state{State::CREATE};
    ConnectionManager& m_connMgr;
};

int main() {
    std::string addr{"0.0.0.0:12345"};

    ConnectionManager connMgr;

    SendBrokerImpl sendBroker{connMgr};
    RecvBroker::AsyncService recvBroker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    builder.RegisterService(&sendBroker);
    builder.RegisterService(&recvBroker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    // std::clog << "cq is " << cq.get() << '\n';

    auto server = builder.BuildAndStart();

    // spawn async request handlers
    // spawnRecvHandlers(recvBroker);
    new AsyncCall{&recvBroker, cq.get(), connMgr};

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