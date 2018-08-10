#include <connector_manager_impl.h>
#include <fruit/fruit.h>
#include <share/netengine/net.h>
#include "mgc_connector.h"
#include <robot_manager.h>

class MGCConnectorManager final : public ConnectorManagerImpl {
public:
    INJECT(MGCConnectorManager(RobotManager& rm)) : ConnectorManagerImpl{rm} {
    }

private:
    void registerServices() override {
        ConnectorParameters params;

        params.isTrusted = false;
        params.skipHandshake = false;
        params.shouldWrap = true;
        auto uc = std::make_shared<MGCConnector>(m_es, params, "User", m_robotManager);
        uc->init();
        m_connectors["User"] = uc;

        params.isTrusted = true;
        params.skipHandshake = true;
        params.shouldWrap = false;
        auto vc = std::make_shared<MGCConnector>(m_es, params, "Video", m_robotManager);
        vc->init();
        m_connectors["Video"] = vc;
    }
};

fruit::Component<ConnectorManager> getConnectorManagerComponent() {
    return fruit::createComponent()
        .bind<ConnectorManager, MGCConnectorManager>()
        .install(getRobotManager)
    ;
}
