#include "x51_connection.h"
// #include "connection_impl.ipp"

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

void X51Connection::sendEvent(IEvent* ev) {
    BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: ev=" << ev->GetEventName();
    makeFragmentThenSend(ev);
}

void X51Connection::onEvent(IEvent* ev) {
    onRealEvent(ev);
}
