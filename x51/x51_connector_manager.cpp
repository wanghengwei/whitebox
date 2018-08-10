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
        params.shouldWrap = true;
        m_connectors["User"] = std::make_shared<X51Connector>(m_es, params, "User", m_robotManager);

        params.isTrusted = true;
        params.skipHandshake = true;
        params.shouldWrap = false;
        m_connectors["Video"] = std::make_shared<X51Connector>(m_es, params, "Video", m_robotManager);
    }
};

fruit::Component<ConnectorManager> getConnectorManagerComponent() {
    return fruit::createComponent()
        .bind<ConnectorManager, X51ConnectorManager>()
        .install(getRobotManager)
    ;
}
