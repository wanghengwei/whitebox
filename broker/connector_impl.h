#pragma once
#include "connector.h"
#include <share/network/eventframe/ClientBase.h>

class ConnectorImpl : public Connector, CClientBase, IEventDispatcher {
public:
    ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params);

    void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, ConnectCallback&&) override;
protected:
    void OnNewLink(IEventLink *newlink) override {}
    void OnConnFail(INetConnection *conn) override;
    void OnConnClose(IEventLink *link) override {}
    bool DispatchEvent(IEventLink * link, IEvent * event) override {return false;}
private:
    std::map<intptr_t, ConnectCallback>  m_cbs;
};
