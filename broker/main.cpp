#include "app.h"
#include <fruit/fruit.h>

int main() {
    fruit::Injector<App> injector{getApp};

    App* app = injector.get<App*>();

    return app->run();
}
