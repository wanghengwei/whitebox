#include <fruit/fruit.h>
#include <app.h>

extern fruit::Component<Server> getServerComponent();
extern fruit::Component<ConnectorManager> getConnectorManagerComponent();

fruit::Component<App> getConcreteApp() {
    return fruit::createComponent()
        .install(getApp)
        .install(getConnectorManagerComponent)
        .install(getServerComponent)
    ;
}
