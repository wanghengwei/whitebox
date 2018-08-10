#include <fruit/fruit.h>
#include <app.h>
// #include "x51_server_impl.h"
// #include "x51_connector_manager_impl.h"

extern fruit::Component<Server> getServerComponent();
extern fruit::Component<ConnectorManager> getConnectorManagerComponent();

fruit::Component<App> getConcreteApp() {
    return fruit::createComponent()
        .install(getApp)
        .install(getConnectorManagerComponent)
        .install(getServerComponent)
    ;
}
