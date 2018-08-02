#pragma once
#include "async_call_impl.h"

class RobotTeardownAsyncCall final : public AsyncCallImpl<RobotTeardownAsyncCall, TeardownParams, Error> {
public:
    using AsyncCallImpl<RobotTeardownAsyncCall, TeardownParams, Error>::AsyncCallImpl;
private:
    void doRequest() override;
    void doReply() override;
};
