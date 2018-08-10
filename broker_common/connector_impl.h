#pragma once
#include "connector.h"
#include <map>
#include <share/network/eventframe/ClientBase.h>

class RobotManager;

class ConnectorImpl : public Connector, CClientBase, IEventDispatcher {
public:
    ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params, const std::string& srv, RobotManager& robotManager);

    void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, int idx, ConnectCallback&&) override;
protected:
    void OnNewLink(IEventLink *newlink) override;
    void OnConnFail(INetConnection *conn) override;
    void OnConnClose(IEventLink *link) override;
    bool DispatchEvent(IEventLink * link, IEvent * event) override;
private:
    std::string m_serviceName;
    ConnectorParameters m_params;
    std::map<intptr_t, std::pair<ConnectCallback, int>>  m_cbs;

    // components
    RobotManager& m_robotManager;
};
