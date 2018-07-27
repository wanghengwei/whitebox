#include "connector_impl.h"

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

void ConnectorImpl::connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass) {
    CClientBase::Connect(addr.c_str(), port, acc.c_str(), pass.c_str());
}

void ConnectorImpl::OnConnFail(INetConnection *conn) {
    const std::string acc{conn->GetAccountName()};
    auto it = m_cbs.find(acc);
    if (it == m_cbs.end()) {
        // log acc=xxx,level=warn blablabla...
        return;
    }

    it->second(nullptr, std::make_exception_ptr(std::runtime_error{conn->GetErrorString()}));
}