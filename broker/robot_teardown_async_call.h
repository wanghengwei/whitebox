#pragma once
#include "async_call.h"

class RobotTeardownAsyncCall final : public AsyncCallImpl<RobotTeardownAsyncCall, TeardownParams, Error> {
public:
    using AsyncCallImpl<RobotTeardownAsyncCall, TeardownParams, Error>::AsyncCallImpl;
private:
    void doRequest() override;
    void doReply() override;
};
