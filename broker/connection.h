#pragma once
#include <functional>

struct IEvent;

class Connection {
public:
    virtual ~Connection() {}
    virtual void sendEvent(IEvent* ev) = 0;
    virtual void waitEvent(std::function<bool(IEvent*)> cond, std::function<void()> cb) = 0;
};
