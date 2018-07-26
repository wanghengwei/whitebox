{{with .Spec}}
#include "{{.EventName}}.h"
class Send{{.EventName}} : public AsyncCallImpl<Send{{.EventName}}> {
public:
    using AsyncCallImpl<Send{{.EventName}}>::AsyncCallImpl;
protected:
    void doRequest() override {
        m_srv->RequestSend{{.EventName}}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    }

    void doReply() override {
        std::string acc = m_request.account();
        std::string srv = m_request.service();
        int idx = m_request.connectionindex();
        auto conn = m_connMgr.findConnection(acc, srv, idx);
        {{.EventName}} ev;
        {{range .Params}}
        ev.{{.Field}} = {{.Value}};
        {{end}}
        conn->sendEvent(&ev);
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};

void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, ConnectionManager& cm) {
    (new Send{{.EventName}}{srv, cq, cm})->proceed();
}
{{end}}
