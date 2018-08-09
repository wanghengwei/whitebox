#include "server.h"
#include <fruit/fruit.h>
#include <grpc++/grpc++.h>

class ServerImpl final : public Server {
public:
    INJECT(ServerImpl()) {
        std::string addr{"0.0.0.0:12345"};
        m_builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
        m_builder.RegisterService(&m_broker);
        m_cq = m_builder.AddCompletionQueue();
    }

    void start() override {
        m_server = m_builder.BuildAndStart();
    }

    CommonService::AsyncService& service() override {
        return m_broker;
    }

    grpc::ServerCompletionQueue& queue() override {
        return *m_cq;
    }

private:
    CommonService::AsyncService m_broker;
    grpc::ServerBuilder m_builder;
    std::unique_ptr<grpc::ServerCompletionQueue> m_cq;
    std::unique_ptr<grpc::Server> m_server;
};

fruit::Component<Server> getServerComponent() {
    return fruit::createComponent()
        .bind<Server, ServerImpl>()
        ;
}