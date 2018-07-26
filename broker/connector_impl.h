#pragma once
#include "connector.h"
#include <share/network/eventframe/ClientBase.h>
#include <exception>
#include <memory>
#include <functional>

class Connection;

using ConnectCallback = std::function<void(std::shared_ptr<Connection>, std::exception_ptr)>;

class ConnectorImpl : public Connector, CClientBase, IEventDispatcher {
public:
    ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params);

    void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass) override;
protected:
    void OnNewLink(IEventLink *newlink) override {}
    void OnConnFail(INetConnection *conn) override;
    void OnConnClose(IEventLink *link) override {}
    // 通过 IEventDispatcher 继承
    bool DispatchEvent(IEventLink * link, IEvent * event) override {return false;}
private:
    std::map<std::string, ConnectCallback>  m_cbs;
};
