{{range .Metadata.IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "{{ .Metadata.Name }}.h"

#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>

using namespace fmt::literals;

class {{ .Metadata.Name }} : public AsyncCallImpl<{{ .Metadata.Name }}> {
public:
    using AsyncCallImpl<{{ .Metadata.Name }}>::AsyncCallImpl;
protected:
    void doRequest() override {
        m_srv->Request{{ .Metadata.Name }}(&m_ctx, &m_request, &m_responder, m_cq, m_cq, this);
    }

    void doReply() override {
        std::string acc = m_request.account();
        std::string srv = m_request.service();
        int idx = m_request.index();

        auto robot = m_robotManager.findRobot(acc);
        if (!robot) {
            auto e = m_reply.mutable_error();
            e->set_errorcode((int)whitebox::errc::CANNOT_FIND_ROBOT);
            e->set_errorcategory(whitebox::ERROR_CATEGORY);
            e->set_message("cannot find robot: acc={}"_format(acc));
        } else {
            auto conn = robot->findConnection(srv, idx);
            if (!conn) {
                auto e = m_reply.mutable_error();
                e->set_errorcode((int)whitebox::errc::CANNOT_FIND_CONNECTION);
                e->set_errorcategory(whitebox::ERROR_CATEGORY);
                e->set_message("cannot find connection: acc={}, srv={}, idx={}"_format(acc, srv, idx));
            } else {
                {{.Spec.Send.EventName}} ev;
                {{range .Spec.Send.Params}}
                ev.{{.Field}} = {{.Value}};
                {{end}}
                conn->sendEvent(&ev);

                conn->waitEvent([](IEvent* ev) {
                    return false
                    {{ range .Spec.Recv.EventNames }}
                    || ev->GetCLSID() == {{.}}::_GetCLSID()
                    {{ end }}
                    ;
                }, [this]() {
                    m_responder.Finish(m_reply, grpc::Status::OK, this);
                });

                return;
            }
        }
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};

void process{{ .Metadata.Name }}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm) {
    (new {{ .Metadata.Name }}{srv, cq, cm})->proceed();
}
