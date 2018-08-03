#pragma once
#include "async_call.h"

class Server;
class ConnectorManager;

AsyncCall* createConnectAsyncCall(Server& svr, ConnectorManager& cm);

