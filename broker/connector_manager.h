#pragma once
#include <fruit/fruit_forward_decls.h>

class ConnectorManager {
public:
    virtual ~ConnectorManager() {}

    virtual void poll() = 0;
};

fruit::Component<ConnectorManager> getConnectorManager();
