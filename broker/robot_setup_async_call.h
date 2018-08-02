#pragma once
#include "async_call.h"

class RobotSetupAsyncCall final : public AsyncCallImpl<RobotSetupAsyncCall, InitParams, Error> {
public:
    using AsyncCallImpl<RobotSetupAsyncCall, InitParams, Error>::AsyncCallImpl;
private:
    void doRequest() override;
    void doReply() override;
};