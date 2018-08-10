#include <fruit/fruit.h>
#include <app.h>
#include "server_impl.h"
#include "connector_manager_impl.h"

fruit::Component<App> getConcreteApp() {
    return fruit::createComponent()
        .install(getApp)
        .install(getConnectorManagerComponent)
        .install(getServerComponent)
    ;
}
