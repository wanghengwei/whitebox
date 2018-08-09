#include "app.h"
#include <fruit/fruit.h>

extern fruit::Component<App> getConcreteApp();

int main() {
    fruit::Injector<App> injector{getConcreteApp};

    App* app = injector.get<App*>();

    return app->run();
}
