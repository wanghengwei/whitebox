{{with .Spec}}
#include "{{.EventName}}.h"
class Recv{{.EventName}} : public AsyncCallImpl<Recv{{.EventName}}> {
public:
    using AsyncCallImpl<Recv{{.EventName}}>::AsyncCallImpl;
protected:
    void doRequest() override {
        m_srv->RequestRecv{{.EventName}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
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
void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) {
    (new Recv{{.EventName}}{srv, cq, cm})->proceed();
}
{{end}}