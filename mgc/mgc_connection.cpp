#include "mgc_connection.h"
// #include "connection_impl.ipp"
#include <video_platform_impl/share/netengine/BiboFrame/Event.h>
#include <video_platform_impl/share/netengine/net.h>
#include <game_event/EventFragmentManager.h>
#include <video_platform_impl/common/event/room_proxy_wrap_events.h>
#include <include/video_client_interface.h>

#include <video_platform_impl/user_proxy/event/room_proxy_events.h>
#include <video_platform_impl/common/event/event_connect_init.h>

// #include "logging.h"
// #include <algorithm>
// #include <share/netengine/BiboFrame/Event.h>
// #include <share/netengine/net.h>
// #include <game_event/EventFragmentManager.h>
// #include <common/event/room_proxy_wrap_events.h>
// #include <include/video_client_interface.h>

// #include <video_platform_impl/user_proxy/event/room_proxy_events.h>
// #include <video_platform_impl/common/event/event_connect_init.h>

// ConnectionImpl::~ConnectionImpl() {
//     // 这里应该会触发OnConnClose，需要注意
//     // 这是唯一将link的ptr设置为null的地方。
//     m_link->SetPtr(nullptr);
//     m_link->Close("user");
// }


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

void MGCConnection::sendEvent(IEvent* ev) {
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

void MGCConnection::onEvent(IEvent* ev) {
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
