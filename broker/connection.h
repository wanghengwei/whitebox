#pragma once
#include <functional>

struct IEvent;

class Connection {
public:
    virtual ~Connection() {}
    virtual void sendEvent(IEvent* ev) = 0;
    // 条件返回的不是bool，是因为需要判断第几个event满足条件，这是为了同时等待多个event的需求
    // 返回-1表示没有匹配的
    virtual void waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) = 0;
};
