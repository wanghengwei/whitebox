#pragma once
#include "server.h"
#include <common.grpc.pb.h>

// 子类继续派生这个类
class ServerImpl : public Server {
public:
    ServerImpl() {
        
    }

    void init() override {
        std::string addr{"0.0.0.0:12345"};
        m_builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
        // m_builder.RegisterService(&m_commonService);
        registerServices();
        // m_builder.RegisterService(&m_brokerService);
        m_cq = m_builder.AddCompletionQueue();
    }

    // 子类重写这个函数，增加更多的注册
    virtual void registerServices() {
        m_builder.RegisterService(&m_commonService);
    }

    void start() override {
        m_server = m_builder.BuildAndStart();
    }

    // 子类需要重写这个函数，并且要在最后调用它
    ::grpc::Service& getService(boost::typeindex::type_index cls) override {
        if (cls == boost::typeindex::type_id<CommonService>()) {
            return m_commonService;
        }

        // if (cls == boost::typeindex::type_id<Broker>()) {
        //     return brokerService();
        // }

        // todo 找个合适的异常类型
        throw std::runtime_error{""};
    }

    grpc::ServerCompletionQueue& queue() override {
        return *m_cq;
    }

protected:
    CommonService::AsyncService m_commonService;
    // Broker::AsyncService m_brokerService;

    grpc::ServerBuilder m_builder;
    std::unique_ptr<grpc::ServerCompletionQueue> m_cq;
    std::unique_ptr<grpc::Server> m_server;
};

// fruit::Component<Server> getServerComponent() {
//     return fruit::createComponent()
//         .bind<Server, ServerImpl>()
//         ;
// }

// fruit::Component<Server> getServerComponent();