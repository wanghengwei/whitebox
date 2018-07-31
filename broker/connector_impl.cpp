#include "connector_impl.h"
#include <boost/log/trivial.hpp>
#include "errors.h"

ConnectorImpl::ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params) : 
    CClientBase(
        selector, 
        INetConnection::PKPROTO_BASE_UTIL, 
        params.isTrusted, 
        !params.isTrusted, 
        nullptr, 
        1024 * 1024, 
        false, 
        PT_POLLING, 
        IO_MAX_CONNECTION
    ) {
        CClientBase::SetEventDispatcher(this);

        INetInterface::net_config_t cfg = GetNetInterface()->GetConfig();
        cfg.m_max_conn_per_IP = 30000;
        cfg.m_skip_handshake = params.skipHandshake ? 1 : 0;

        GetNetInterface()->SetConfig(cfg);
    }

void ConnectorImpl::connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, ConnectCallback&& cb) {
    BOOST_LOG_TRIVIAL(info) << "ConnectorImpl::connect: addr=" << addr << ", port=" << port << ", acc=" << acc;

    auto c = CClientBase::Connect(addr.c_str(), port, acc.c_str(), pass.c_str());
    BOOST_LOG_TRIVIAL(info) << "CClientBase::Connect returned conn is " << c;

    auto k = intptr_t(c);
    auto it = m_cbs.find(k);
    if (it != m_cbs.end()) {
        // 有个回调有相同的conn的指针，看起来不大可能
        BOOST_LOG_TRIVIAL(fatal) << "impossible!";
        BOOST_ASSERT(false);
    }
    m_cbs.insert(std::make_pair(k, cb));
}

void ConnectorImpl::OnConnFail(INetConnection *conn) {
    const std::string acc{conn->GetAccountName()};

    BOOST_LOG_TRIVIAL(info) << "ConnectorImpl::OnConnFail: acc=" << acc << ", conn=" << conn;

    auto it = m_cbs.find(intptr_t(conn));
    if (it == m_cbs.end()) {
        // log acc=xxx,level=warn blablabla...
        BOOST_LOG_TRIVIAL(warning) << "no callback for connect request: acc=" << acc;
        return;
    }
    auto cb = std::move(it->second);
    m_cbs.erase(it);
    cb(nullptr, whitebox::errc::CONNECT_FAILED, conn->GetErrorString());
}
