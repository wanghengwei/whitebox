#include <server_impl.h>
#include <fruit/fruit.h>
#include <grpc++/grpc++.h>
#include <broker.grpc.pb.h>

class MGCServerImpl final : public ServerImpl {
public:
    INJECT(MGCServerImpl()) {
    }

    void registerServices() override {
        ServerImpl::registerServices();
        m_builder.RegisterService(&m_brokerService);
    }

    ::grpc::Service& getService(boost::typeindex::type_index cls) override {
        if (cls == boost::typeindex::type_id<Broker>()) {
            return m_brokerService;
        }

        return ServerImpl::getService(cls);
    }

private:
    Broker::AsyncService m_brokerService;
};

fruit::Component<Server> getServerComponent() {
    return fruit::createComponent()
        .bind<Server, MGCServerImpl>()
        ;
}
