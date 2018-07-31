{{with .Spec}}
#include "{{.EventName}}.h"
{{range .IncludeHeaders}}
#include <{{.}}>
{{end}}

#include "../robot_manager.h"
#include "../robot.h"
#include "../connection.h"
#include "../errors.h"
#include <fmt/format.h>

using namespace fmt::literals;

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
        int idx = m_request.index();
        //auto conn = m_connMgr.findConnection(acc, srv, idx);
        
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
                conn->waitEvent([](IEvent* ev) {
                    return ev->GetCLSID() == {{.EventName}}::_GetCLSID();
                }, [this]() {
                    m_responder.Finish(m_reply, grpc::Status::OK, this);
                });
                return;
            }
        }

        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};
void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm) {
    (new Recv{{.EventName}}{srv, cq, cm})->proceed();
}
{{end}}