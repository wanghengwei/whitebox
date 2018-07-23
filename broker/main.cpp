// #define RAPIDJSON_HAS_STDSTRING 1
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>
#include <grpc++/grpc++.h>
#include <x51.grpc.pb.h>

// **VARIANT**
#include <CEventLogin.h>
#include <CEventLoginRes.h>

// using namespace x51;

// // **variation**
// class SendCEventLogin : public AsyncCallImpl<SendCEventLogin> {
// public:
//     using AsyncCallImpl<SendCEventLogin>::AsyncCallImpl;
// protected:
//     void doRequest() override {
//         m_srv->RequestSendCEventLogin(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
//     }

//     void doReply() override {
//         std::string acc = m_request.account();
//         std::string srv = m_request.service();
//         int idx = m_request.connectionindex();
//         auto conn = m_connMgr.findConnection(acc, srv, idx);
//         CEventLogin ev;
//         ev.m_roomId = 1212;
//         conn->sendEvent(&ev);
//         m_responder.Finish(m_reply, grpc::Status::OK, this);
//     }
// };

// // **variation**
// class RecvCEventLoginRes : public AsyncCallImpl<RecvCEventLoginRes> {
// public:
//     using AsyncCallImpl<RecvCEventLoginRes>::AsyncCallImpl;
// protected:
//     void doRequest() override {
//         m_srv->RequestRecvCEventLoginRes(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
//     }

//     void doReply() override {
//         std::string acc = m_request.account();
//         std::string srv = m_request.service();
//         int idx = m_request.connectionindex();
//         auto conn = m_connMgr.findConnection(acc, srv, idx);
        
//         conn->waitEvent([](const CEvent&) {
//             return true;
//         }, [this]() {
//             m_responder.Finish(m_reply, grpc::Status::OK, this);
//         });
//     }
// };

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
    processCEventLogin(&broker, cq.get(), connMgr);
    processCEventLoginRes(&broker, cq.get(), connMgr);
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
