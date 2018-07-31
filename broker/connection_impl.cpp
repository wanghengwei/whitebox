#include "connection_impl.h"
#include <algorithm>
#include <boost/log/trivial.hpp>
#include <video_platform_impl/share/netengine/BiboFrame/Event.h>
#include <video_platform_impl/share/netengine/net.h>

void ConnectionImpl::sendEvent(IEvent* ev) {
    BOOST_LOG_TRIVIAL(info) << "ConnectionImpl::sendEvent: ev=" << ev->GetRealName();

    m_link->SendEvent(ev);
}

void ConnectionImpl::waitEvent(std::function<bool(IEvent*)> cond, std::function<void()> cb) {
    m_eventHandlers.push_back({cond, cb});
}

void ConnectionImpl::onEvent(IEvent* ev) {
    auto it = std::remove_if(m_eventHandlers.begin(), m_eventHandlers.end(), [ev](const auto& h) {
        return h.condition(ev);
    });

    for (auto i = it; i != m_eventHandlers.end(); ++i) {
        i->callback();
    }

    m_eventHandlers.erase(it, m_eventHandlers.end());
}
