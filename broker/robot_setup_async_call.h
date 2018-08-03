#pragma once
#include "async_call.h"

class RobotManager;
class Server;

AsyncCall* createRobotSetupAsyncCall(Server& svr, RobotManager& rm);
