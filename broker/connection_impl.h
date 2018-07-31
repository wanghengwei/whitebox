#pragma once
#include "connection.h"
#include <vector>

struct IEventLink;

struct EventHandler {
    std::function<bool(IEvent*)> condition;
    std::function<void()> callback;
};

class ConnectionImpl final : public Connection {
public:
    explicit ConnectionImpl(IEventLink* link) : m_link{link} {}

    void sendEvent(IEvent* ev) override;
    void waitEvent(std::function<bool(IEvent*)> cond, std::function<void()> cb) override;

    void onEvent(IEvent* ev);
private:
    IEventLink* m_link{};
    std::vector<EventHandler> m_eventHandlers;
};
