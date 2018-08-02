#include "async_service.h"
#include <fruit/fruit.h>

class AsyncServiceImpl final : public AsyncService {
public:
    INJECT(AsyncServiceImpl()) {}
};

fruit::Component<AsyncService> getAsyncService() {
    return fruit::createComponent()
        .bind<AsyncService, AsyncServiceImpl>()
    ;
}