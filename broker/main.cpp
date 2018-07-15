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
    ::grpc::Status SendCEventLogin(::grpc::ServerContext* context, const ::x51::SendEventParams* request, ::x51::Result* response) override {
        // response->set_ok(true);
        // response->set_category("");
        auto acc = request->conn().account();
        auto srvName =request->conn().service();
        auto connIdx = request->conn().connectionindex();
        std::string params = request->params();
        rapidjson::Document doc;
        doc.Parse(params.c_str());

        auto conn = connectionManager.findConnection(acc, srvName, connIdx);

        CEventLogin ev;

        ev.m_roomId = rapidjson::GetValueByPointer(doc, "/roomId")->GetInt();

        std::clog << "Send CEventLogin: roomId=" << ev.m_roomId << '\n';

        conn->sendEvent(&ev);
        return grpc::Status::OK;
    }
private:
    ConnectionManager connectionManager;
};

void spawnRecvHandlers(RecvBroker::AsyncService& srv) {
    srv.RequestRecvCEventLoginRes();
}

int main() {
    std::string addr{"0.0.0.0:12345"};
    SendBrokerImpl sendBroker;
    RecvBroker::AsyncService recvBroker;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    
    builder.RegisterService(&sendBroker);
    builder.RegisterService(&recvBroker);

    std::unique_ptr<grpc::ServerCompletionQueue> cq = builder.AddCompletionQueue();

    builder.BuildAndStart();

    // spawn async request handlers
    spawnRecvHandlers(recvBroker);

    void* tag;
    bool ok;
    while (true) {
        cq->Next(&tag, &ok);
    }

    return 0;
}