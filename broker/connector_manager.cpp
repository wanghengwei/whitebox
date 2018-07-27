#include "connector_manager.h"
#include <fruit/fruit.h>
#include <share/netengine/net.h>
#include "connector_impl.h"

class ConnectorManagerImpl final : public ConnectorManager {
public:
    INJECT(ConnectorManagerImpl()) {
        m_es = GetBiboRegistry()->CreateEventSelector();

        // 初始化若干Conector。跟具体项目有关
        init();
    }

    void poll() override {
        m_es->ProcessEvents(0);
    }

    Connector* findConnector(const std::string& serviceName) override {
        auto it = m_connectors.find(serviceName);
        if (it == m_connectors.end()) {
            return nullptr;
        }

        return it->second.get();
    }
private:
    void init() {
        ConnectorParameters params;

        params.isTrusted = true;
        m_connectors["User"] = std::make_shared<ConnectorImpl>(m_es, params);

        params.isTrusted = false;
        m_connectors["Video"] = std::make_shared<ConnectorImpl>(m_es, params);
    }
private:
    IEventSelector *m_es{};

    std::map<std::string, std::shared_ptr<Connector>> m_connectors;
};

fruit::Component<ConnectorManager> getConnectorManager() {
    return fruit::createComponent()
        .bind<ConnectorManager, ConnectorManagerImpl>()
    ;
}