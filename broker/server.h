#pragma once
// #include <fruit/fruit_forward_decls.h>
// #include <common.grpc.pb.h>
#include <grpc++/grpc++.h>
#include <boost/type_index.hpp>

// 表示一个grpc server
// todo 最好是改下名
class Server {
public:
    virtual ~Server() {}

    virtual void start() = 0;

    // todo 以后不一定只有1、2个service，而且类型在这里也无法确定，可能必须得用父类型作为返回值了。
    // virtual ::grpc::Service& commonService() = 0;
    // todo broker 这个名字最好也改了，不太符合其意义了
    // virtual ::grpc::Service& brokerService() = 0;
    virtual ::grpc::Service& getService(boost::typeindex::type_index cls) = 0;

    template<typename T>
    typename T::AsyncService& getService() {
        return static_cast<typename T::AsyncService&>(getService(boost::typeindex::type_id<T>()));
    }

    virtual grpc::ServerCompletionQueue& queue() = 0;
};

// fruit::Component<Server> getServerComponent();