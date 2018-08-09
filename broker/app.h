#pragma once
#include <fruit/fruit_forward_decls.h>
#include "connector_manager.h"

// 执行入口
class App {
public:
    virtual ~App() {}
    
    virtual int run() = 0;
};

fruit::Component<fruit::Required<ConnectorManager>, App> getApp();
