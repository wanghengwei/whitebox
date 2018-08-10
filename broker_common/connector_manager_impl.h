#include "connector_manager.h"
#include <share/netengine/net.h>
#include <robot_manager.h>

// 这个类型依赖于项目代码，因此在公共部分不参与编译。
// 子类重写其注册 registerServices 这个函数来添加项目相关的connector
class ConnectorManagerImpl : public ConnectorManager {
public:
    ConnectorManagerImpl(RobotManager& rm) : m_robotManager{rm} {
        m_es = GetBiboRegistry()->CreateEventSelector();
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
protected:
    virtual void registerServices() = 0;
    
private:
    void init() override {
        // GetLogInterface()->SetSystemPriority(700);
        
        registerServices();
    }

protected:
    IEventSelector *m_es{};

    std::map<std::string, std::shared_ptr<Connector>> m_connectors;

    RobotManager& m_robotManager;
};
