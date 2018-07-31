#pragma once
#include <fruit/fruit_forward_decls.h>

class App {
public:
    virtual ~App() {}
    
    virtual int run() = 0;
};

fruit::Component<App> getApp();
