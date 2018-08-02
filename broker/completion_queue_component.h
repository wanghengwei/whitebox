#pragma once
#include <fruit/fruit_forward_decls.h>

class CompletionQueueComponent {
public:
    virtual ~CompletionQueueComponent() {}

    virtual grpc::ServerComplectionQueue& get() = 0;

    virtual void set(std::unique_ptr<grpc::ServerComplectionQueue> p) = 0;
};

fruit::Component<CompletionQueueComponent> getCompletionQueueComponent();