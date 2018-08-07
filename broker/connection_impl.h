#pragma once
#include "connection.h"
#include <vector>

struct IEventLink;

struct EventHandler {
    std::function<int(IEvent*)> condition;
    std::function<void(int, IEvent*)> callback;
    // 这是condition执行的结果，需要暂存一下
    int matchedIndex{-1};
    IEvent* matchedEvent{};
};

class ConnectionImpl final : public Connection {
public:
    // 参数 wrap 表示是否用 CEventRoomProxyWrap 包装起来
    // 目前只有 mgc 的部分服务器需要。编译别的项目时，这个event的定义是没有的。
    // 未来可能可以考虑用更通用、灵活的方式来处理。不过现在就用个flag来作就行
    explicit ConnectionImpl(IEventLink* link, bool wrap = false) : m_link{link}, m_wrap{wrap} {}

    ~ConnectionImpl();

    void sendEvent(IEvent* ev) override;

    void waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) override;

    void setClosed() override {
        m_isClosed = true;
    }

    bool isClosed() const override {
        return m_isClosed;
    }

    void onEvent(IEvent* ev);

private:
    void makeFragmentThenSend(IEvent *);
    void onRealEvent(IEvent *ev);
private:
    IEventLink* m_link{};
    std::vector<EventHandler> m_eventHandlers;
    bool m_wrap{false};
    bool m_isClosed{false};
};
