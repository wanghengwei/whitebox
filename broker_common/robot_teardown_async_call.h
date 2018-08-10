#pragma once
#include "async_call.h"

class RobotManager;
class Server;

AsyncCall* createRobotTeardownAsyncCall(Server& svr, RobotManager&);
