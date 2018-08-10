#pragma once
#include <functional>
#include <chrono>

struct IEvent;

// 表示一个连接。一个机器人可能会同时保存好几个连接
class Connection {
public:
    virtual ~Connection() {}
    virtual void sendEvent(IEvent* ev) = 0;
    // 条件返回的不是bool，是因为需要判断第几个event满足条件，这是为了同时等待多个event的需求
    // 返回-1表示没有匹配的
    virtual void waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) = 0;

    // 标记这个连接被关闭了
    virtual void setClosed() = 0;

    virtual bool isClosed() const = 0;

    virtual void update(const std::chrono::system_clock::time_point& now) = 0;
};
