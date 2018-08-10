#include <connector_manager_impl.h>
#include <fruit/fruit.h>
#include <share/netengine/net.h>
#include "x51_connector.h"
#include <robot_manager.h>

class X51ConnectorManager final : public ConnectorManagerImpl {
public:
    INJECT(X51ConnectorManager(RobotManager& rm)) : ConnectorManagerImpl{rm} {
    }

private:
    void registerServices() override {
        ConnectorParameters params;

        params.isTrusted = false;
        params.skipHandshake = false;
        params.shouldWrap = false;
        auto c = std::make_shared<X51Connector>(m_es, params, "Game", m_robotManager);
        c->init();
        m_connectors["Game"] = c;
    }
};

fruit::Component<ConnectorManager> getConnectorManagerComponent() {
    return fruit::createComponent()
        .bind<ConnectorManager, X51ConnectorManager>()
        .install(getRobotManager)
    ;
}
