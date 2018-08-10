#pragma once
#include <connection_impl.h>
#include <vector>

// struct IEventLink;

// struct EventHandler {
//     EventHandler(EventHandler&&) = default;
//     EventHandler& operator=(EventHandler&&) = default;

//     EventHandler(EventHandler&) = delete;
//     EventHandler& operator=(EventHandler&) = delete;

//     std::function<int(IEvent*)> condition;
//     std::function<void(int, IEvent*)> callback;
//     // 这是condition执行的结果，需要暂存一下
//     int matchedIndex{-1};
//     IEvent* matchedEvent{};
//     // 用于判断超时
//     std::chrono::system_clock::time_point deadline;
// };

class X51Connection final : public ConnectionImpl {
public:
    // 参数 wrap 表示是否用 CEventRoomProxyWrap 包装起来
    // 目前只有 mgc 的部分服务器需要。编译别的项目时，这个event的定义是没有的。
    // 未来可能可以考虑用更通用、灵活的方式来处理。不过现在就用个flag来作就行
    explicit X51Connection(IEventLink* link) : ConnectionImpl{link} {}

    // ~X51ConnectionImpl();

    void sendEvent(IEvent* ev) override;

    void onEvent(IEvent* ev) override;
    
};
