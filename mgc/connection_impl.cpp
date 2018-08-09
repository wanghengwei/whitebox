#include "connection_impl.h"
#include "logging.h"
#include <algorithm>
#include <video_platform_impl/share/netengine/BiboFrame/Event.h>
#include <video_platform_impl/share/netengine/net.h>
#include <game_event/EventFragmentManager.h>
#include <video_platform_impl/common/event/room_proxy_wrap_events.h>
#include <include/video_client_interface.h>

#include <video_platform_impl/user_proxy/event/room_proxy_events.h>
#include <video_platform_impl/common/event/event_connect_init.h>

static bool shouldWrap(IEvent *ev)
{
    int id = ev->GetCLSID();
    return true
        // 以下几个消息在需要wrap的服务器上也不wrap
        && id != CLSID_CEventVideoInitConnectionRequest
        && id != CLSID_CEventVideoInitConnectionResponse
        && id != CLSID_CEventQueryVideoAccountInfo
        && id != CLSID_CEventQueryVideoAccountInfoRes
    ;
}

ConnectionImpl::~ConnectionImpl() {
    // 这里应该会触发OnConnClose，需要注意
    // 这是唯一将link的ptr设置为null的地方。
    m_link->SetPtr(nullptr);
    m_link->Close("user");
}

void ConnectionImpl::sendEvent(IEvent* ev) {
    

    // 首先看是否wrap
    if (m_wrap && shouldWrap(ev)) {
        BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: wrapped_ev=" << ev->GetEventName();

        static int roomProxyWrappedEventSerialId = 0;
        static const int CLIENT_VERSION = 
            VIDEO_CLIENT_VERSION_MAJAR << 24 |
            VIDEO_CLIENT_VERSION_MINOR << 16 |
            VIDEO_CLIENT_VERSION_REVISION << 8 |
            VIDEO_CLIENT_VERSION_BUILD;
        CEventRoomProxyWrapEvent wrap_evt;
        wrap_evt.AttachEvent(ev);
        wrap_evt.serialID = ++roomProxyWrappedEventSerialId;
        wrap_evt.client_version = CLIENT_VERSION;

        makeFragmentThenSend(&wrap_evt);
    } else {
        BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: ev=" << ev->GetEventName();
        makeFragmentThenSend(ev);
    }
}

void ConnectionImpl::makeFragmentThenSend(IEvent *ev) {
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

void ConnectionImpl::waitEvent(std::function<int(IEvent*)> cond, std::function<void(int, IEvent*)> cb) {
    BOOST_LOG_TRIVIAL(info) << "[{}] ConnectionImpl::waitEvent:"_format(m_link->GetConnection()->GetAccountName());

    // 把条件和回调都保存起来。当有消息满足条件时回调会被调用
    // 另外，如果一段时间还没消息来，那么回调也应该被调用，错误码是超时。
    // 也许应该有另外一组回调是不超时的，就像以前的handler那样。再议
    EventHandler eh{cond, cb};
    eh.deadline = m_now + std::chrono::seconds{20};
    m_eventHandlers.emplace_back(std::move(eh));
}

void ConnectionImpl::onEvent(IEvent* ev) {
    // BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::onEvent: clsid=" << ev->GetCLSID() <<", name=" << ev->GetEventName() << ", handlers=" << m_eventHandlers.size() << ", this=" << this;

    // 处理wrap。这里的代码不太好看，以后看需要了改改
    if (m_wrap && shouldWrap(ev)) {
        CBiboPtr<IEvent> inner;
        CEventRoomProxyWrapEvent *p = static_cast<CEventRoomProxyWrapEvent *>(ev);

        bool b = p->GetAttachedEvent(&inner);
        if (!b) {
            // 应该不正常，咋办？
            // 看起来就是有消息会失败，算了不管
            // BOOST_LOG_TRIVIAL(warning) << "get attached event failed";
            return;
        }
        onRealEvent(inner);
    } else {
        onRealEvent(ev);
    }
}

void ConnectionImpl::onRealEvent(IEvent *ev) {
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

void ConnectionImpl::update(const std::chrono::system_clock::time_point& now) {
    this->m_now = now;
    clearTimeoutWaitingCallbacks(now);
}

void ConnectionImpl::clearTimeoutWaitingCallbacks(const std::chrono::system_clock::time_point& now) {
    auto tobeRemoved = std::remove_if(m_eventHandlers.begin(), m_eventHandlers.end(), [&now](auto& h) {
        return h.deadline < now;
    });

    for (auto it = tobeRemoved; it != m_eventHandlers.end(); ++it) {
        it->callback(-1, nullptr);
    }

    m_eventHandlers.erase(tobeRemoved, m_eventHandlers.end());
}