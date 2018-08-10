#include "server_impl.h"
#include <fruit/fruit.h>
#include <grpc++/grpc++.h>
#include <common.grpc.pb.h>
#include <broker.grpc.pb.h>

class ServerImpl final : public Server {
public:
    INJECT(ServerImpl()) {
        std::string addr{"0.0.0.0:12345"};
        m_builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
        m_builder.RegisterService(&m_commonService);
        m_builder.RegisterService(&m_brokerService);
        m_cq = m_builder.AddCompletionQueue();
    }

    void start() override {
        m_server = m_builder.BuildAndStart();
    }

    ::grpc::Service& commonService() {
        return m_commonService;
    }

    ::grpc::Service& brokerService() {
        return m_brokerService;
    }

    ::grpc::Service& getService(boost::typeindex::type_index cls) override {
        if (cls == boost::typeindex::type_id<CommonService>()) {
            return commonService();
        }

        if (cls == boost::typeindex::type_id<Broker>()) {
            return brokerService();
        }

        // todo 找个合适的异常类型
        throw std::runtime_error{""};
    }

    grpc::ServerCompletionQueue& queue() override {
        return *m_cq;
    }

private:
    CommonService::AsyncService m_commonService;
    Broker::AsyncService m_brokerService;

    grpc::ServerBuilder m_builder;
    std::unique_ptr<grpc::ServerCompletionQueue> m_cq;
    std::unique_ptr<grpc::Server> m_server;
};

fruit::Component<Server> getServerComponent() {
    return fruit::createComponent()
        .bind<Server, ServerImpl>()
        ;
}