#pragma once
#include <fruit/fruit_forward_decls.h>
#include <string>

class Connector;

class ConnectorManager {
public:
    virtual ~ConnectorManager() {}

    virtual void init() = 0;

    virtual void poll() = 0;

    virtual Connector* findConnector(const std::string& serviceName) = 0;
};

// fruit::Component<ConnectorManager> getConnectorManager();
