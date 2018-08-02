#include "completion_queue_component.h"
#include <fruit/fruit.h>

class CompletionQueueComponentImpl final : public CompletionQueueComponent {
public:
    INJECT(CompletionQueueComponentImpl()) {}

    grpc::ServerComplectionQueue& get() override {
        return *m_cq;
    }

    void set(std::unique_ptr<grpc::ServerComplectionQueue> p) override {
        m_cq.swap(p);
    }

private:
    std::unique_ptr<grpc::ServerComplectionQueue> m_cq;
};

fruit::Component<CompletionQueueComponent> getCompletionQueueComponent() {
    return fruit::createComponent()
        .bind<CompletionQueueComponent, CompletionQueueComponentImpl>()
    ;
}