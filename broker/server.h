#pragma once
#include <fruit/fruit_forward_decls.h>
#include <common.grpc.pb.h>
#include <grpc++/grpc++.h>

// 表示一个grpc server
class Server {
public:
    virtual ~Server() {}

    virtual void start() = 0;

    // virtual Broker::AsyncService& service() = 0;
    // virtual ::grpc::Service& service() = 0;
    virtual CommonService::AsyncService& service() = 0;
    virtual grpc::ServerCompletionQueue& queue() = 0;
};

fruit::Component<Server> getServerComponent();