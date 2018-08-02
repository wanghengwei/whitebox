#include "async_call_factory.h"
#include <fruit/fruit.h>

class AsyncCallFactoryImpl final : public AsyncCallFactory {
public:
    INJECT(AsyncCallFactoryImpl(
        RobotManager* robotManager,
        ConnectorManager* connectorManger,
        AsyncService* asyncService,
        CompletionQueueComponent *completionQueueComponent
    )) :
        m_robotManager{robotManager},
        m_connectorManager{connectorManager},
        m_asyncService{asyncService},
        m_completionQueueComponent{completionQueueComponent}
    {}

    RobotManager& getRobotManager() const override {
        return *m_robotManager;
    }

    ConnectorManager& getConnectorManager() const override {
        return *m_connectorManager;
    }

    AsyncService& getAsyncService() const override {
        return *m_asyncService;
    }
    
    CompletionQueueComponent& getCompletionQueueComponent() const override {
        return *m_completionQueueComponent;
    }


private:
    RobotManager* m_robotManager;
    ConnectorManager* m_connectorManager;
    AsyncService* m_asyncService;
    CompletionQueueComponent* m_completionQueueComponent;
};

fruit::Component<AsyncCallFactory> getAsyncCallFactory() {
    return fruit::createComponent()
        .bind<AsyncCallFactory, AsyncCallFactoryImpl>()
    ;
}