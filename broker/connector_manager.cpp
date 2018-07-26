#include "connector_manager.h"
#include <fruit/fruit.h>
#include <share/netengine/net.h>

class ConnectorManagerImpl : public ConnectorManager {
public:
    INJECT(ConnectorManagerImpl()) {
        m_es = GetBiboRegistry()->CreateEventSelector();
    }

    void poll() override {
        m_es->ProcessEvents(0);
    }
private:
    IEventSelector *m_es{};
};

fruit::Component<ConnectorManager> getConnectorManager() {
    return fruit::createComponent()
        .bind<ConnectorManager, ConnectorManagerImpl>()
    ;
}