#include <grpc++/grpc++.h>
#include <x51.grpc.pb.h>

using namespace x51;

class BrokerImpl : public Broker::Service {
    ::grpc::Status Connect(::grpc::ServerContext* context, const ::x51::ConnectParams* request, ::x51::ConnectResults* response) override {
        response->set_ok(true);
        return grpc::Status::OK;
    }
};

int main() {
    std::string addr{"0.0.0.0:11111"};
    BrokerImpl broker;
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addr, grpc::InsecureServerCredentials());
    builder.RegisterService(&broker);
    builder.BuildAndStart()->Wait();
    return 0;
}