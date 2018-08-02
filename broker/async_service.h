#pragma once
#include <fruit/fruit_forward_decls.h>

class AsyncService {
public:
    virtual ~AsyncService() {}
};

fruit::Component<AsyncService> getAsyncService();