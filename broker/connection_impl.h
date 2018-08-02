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
    explicit ConnectionImpl(IEventLink* link) : m_link{link} {}

    void sendEvent(IEvent* ev) override;
    void waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) override;

    void onEvent(IEvent* ev);
private:
    IEventLink* m_link{};
    std::vector<EventHandler> m_eventHandlers;
};
