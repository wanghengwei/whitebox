#pragma once
#include <fruit/fruit_forward_decls.h>

class RobotManager;
class ConnectorManager;

class AsyncCallFactory {
public:
    virtual ~AsyncCallFactory() {}
    
    template<typename T>
    T* create() {
        T* t = new T{this};
    }

    virtual RobotManager& getRobotManager() const = 0;
    virtual ConnectorManager& getConnectorManager() const = 0;
    virtual AsyncService& getAsyncService() const = 0;
    virtual CompletionQueueComponent& getCompletionQueueComponent() const = 0;
};

fruit::Component<AsyncCallFactory> getAsyncCallFactory();