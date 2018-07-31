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
                {{.EventName}} ev;
                {{range .Params}}
                ev.{{.Field}} = {{.Value}};
                {{end}}
                conn->sendEvent(&ev);
            }
        }
        m_responder.Finish(m_reply, grpc::Status::OK, this);
    }
};

void process{{.EventName}}(Broker::AsyncService* srv, grpc::ServerCompletionQueue* cq, RobotManager& cm) {
    (new Send{{.EventName}}{srv, cq, cm})->proceed();
}
{{end}}
