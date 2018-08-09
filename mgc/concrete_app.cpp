#include <fruit/fruit.h>
#include <app.h>

fruit::Component<App> getConcreteApp() {
    return fruit::createComponent()
        .install(getApp)
        .install(getConnectorManager)
    ;
}