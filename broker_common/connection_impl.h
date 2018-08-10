#pragma once
#include "connection.h"
#include <vector>

struct IEventLink;

struct EventHandler {
    EventHandler(EventHandler&&) = default;
    EventHandler& operator=(EventHandler&&) = default;

    EventHandler(EventHandler&) = delete;
    EventHandler& operator=(EventHandler&) = delete;

    std::function<int(IEvent*)> condition;
    std::function<void(int, IEvent*)> callback;
    // 这是condition执行的结果，需要暂存一下
    int matchedIndex{-1};
    IEvent* matchedEvent{};
    // 用于判断超时
    std::chrono::system_clock::time_point deadline;
};

// 子类应该重写 sendEvent 和 onEvent
class ConnectionImpl : public Connection {
public:
    // 参数 wrap 表示是否用 CEventRoomProxyWrap 包装起来
    // 目前只有 mgc 的部分服务器需要。编译别的项目时，这个event的定义是没有的。
    // 未来可能可以考虑用更通用、灵活的方式来处理。不过现在就用个flag来作就行
    explicit ConnectionImpl(IEventLink* link, bool wrap = false) : m_link{link}, m_wrap{wrap} {}

    ~ConnectionImpl();

    // void sendEvent(IEvent* ev) override;

    void waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) override;

    void setClosed() override {
        m_isClosed = true;
    }

    bool isClosed() const override {
        return m_isClosed;
    }

    virtual void onEvent(IEvent* ev) = 0;
    
    void update(const std::chrono::system_clock::time_point& now) override;

protected:
    void makeFragmentThenSend(IEvent *);
    void onRealEvent(IEvent *ev);
private:
    void clearTimeoutWaitingCallbacks(const std::chrono::system_clock::time_point& now);
protected: // 图方便就protected了。todo 以后改掉
    IEventLink* m_link{};
    std::vector<EventHandler> m_eventHandlers;
    bool m_wrap{false};
    bool m_isClosed{false};

    // 保存now。主要是考虑到优化，每次有消息要等待都调用一次获取当前时间有点浪费
    std::chrono::system_clock::time_point m_now;
};


/////////////

// #include <connection_impl.h>
#include "logging.h"
#include <algorithm>
#include <share/netengine/BiboFrame/Event.h>
#include <share/netengine/net.h>
#include <game_event/EventFragmentManager.h>
// #include <common/event/room_proxy_wrap_events.h>
// #include <include/video_client_interface.h>

// #include <video_platform_impl/user_proxy/event/room_proxy_events.h>
// #include <video_platform_impl/common/event/event_connect_init.h>

inline ConnectionImpl::~ConnectionImpl() {
    // 这里应该会触发OnConnClose，需要注意
    // 这是唯一将link的ptr设置为null的地方。
    m_link->SetPtr(nullptr);
    m_link->Close("user");
}

// void ConnectionImpl::sendEvent(IEvent* ev) {
    

//     // 首先看是否wrap
//     if (m_wrap && shouldWrap(ev)) {
//         // BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: wrapped_ev=" << ev->GetEventName();

//         // static int roomProxyWrappedEventSerialId = 0;
//         // static const int CLIENT_VERSION = 
//         //     VIDEO_CLIENT_VERSION_MAJAR << 24 |
//         //     VIDEO_CLIENT_VERSION_MINOR << 16 |
//         //     VIDEO_CLIENT_VERSION_REVISION << 8 |
//         //     VIDEO_CLIENT_VERSION_BUILD;
//         // CEventRoomProxyWrapEvent wrap_evt;
//         // wrap_evt.AttachEvent(ev);
//         // wrap_evt.serialID = ++roomProxyWrappedEventSerialId;
//         // wrap_evt.client_version = CLIENT_VERSION;

//         // makeFragmentThenSend(&wrap_evt);
//     } else {
//         BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: ev=" << ev->GetEventName();
//         makeFragmentThenSend(ev);
//     }
// }

inline void ConnectionImpl::makeFragmentThenSend(IEvent *ev) {
    static CEventFragmentManager cfm;

    std::vector<IEvent*> frags;
    if (cfm.SliceEvent(ev, frags)) {
        for (std::vector<IEvent*>::iterator it = frags.begin(); it != frags.end(); ++it) {
            m_link->SendEvent(*it);
            (*it)->Release();
        }
    } else {
        m_link->SendEvent(ev);
    }
}

inline void ConnectionImpl::waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) {
    BOOST_LOG_TRIVIAL(info) << "[{}] ConnectionImpl::waitEvent:"_format(m_link->GetConnection()->GetAccountName());

    // 把条件和回调都保存起来。当有消息满足条件时回调会被调用
    // 另外，如果一段时间还没消息来，那么回调也应该被调用，错误码是超时。
    // 也许应该有另外一组回调是不超时的，就像以前的handler那样。再议
    EventHandler eh{cond, cb};
    eh.deadline = m_now + std::chrono::seconds{20};
    m_eventHandlers.emplace_back(std::move(eh));
}

// void ConnectionImpl::onEvent(IEvent* ev) {
//     // BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::onEvent: clsid=" << ev->GetCLSID() <<", name=" << ev->GetEventName() << ", handlers=" << m_eventHandlers.size() << ", this=" << this;

//     // 处理wrap。这里的代码不太好看，以后看需要了改改
//     if (m_wrap && shouldWrap(ev)) {
//         // CBiboPtr<IEvent> inner;
//         // CEventRoomProxyWrapEvent *p = static_cast<CEventRoomProxyWrapEvent *>(ev);

//         // bool b = p->GetAttachedEvent(&inner);
//         // if (!b) {
//         //     // 应该不正常，咋办？
//         //     // 看起来就是有消息会失败，算了不管
//         //     // BOOST_LOG_TRIVIAL(warning) << "get attached event failed";
//         //     return;
//         // }
//         // onRealEvent(inner);
//     } else {
//         onRealEvent(ev);
//     }
// }

inline void ConnectionImpl::onRealEvent(IEvent *ev) {
    // 把所有匹配的回调放到数组末尾等待调用并删除
    auto it = std::remove_if(m_eventHandlers.begin(), m_eventHandlers.end(), [ev](auto& h) {
        int idx = h.condition(ev);
        h.matchedIndex = idx;
        h.matchedEvent = ev;
        return idx != -1;
    });

    for (auto i = it; i != m_eventHandlers.end(); ++i) {
        // BOOST_LOG_TRIVIAL(info) << "call event handler";
        i->callback(i->matchedIndex, i->matchedEvent);
    }

    m_eventHandlers.erase(it, m_eventHandlers.end());
}

inline void ConnectionImpl::update(const std::chrono::system_clock::time_point& now) {
    this->m_now = now;
    clearTimeoutWaitingCallbacks(now);
}

inline void ConnectionImpl::clearTimeoutWaitingCallbacks(const std::chrono::system_clock::time_point& now) {
    auto tobeRemoved = std::remove_if(m_eventHandlers.begin(), m_eventHandlers.end(), [&now](auto& h) {
        return h.deadline < now;
    });

    for (auto it = tobeRemoved; it != m_eventHandlers.end(); ++it) {
        it->callback(-1, nullptr);
    }

    m_eventHandlers.erase(tobeRemoved, m_eventHandlers.end());
}