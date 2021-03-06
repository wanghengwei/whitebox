﻿#pragma once
#include "connector.h"
#include <map>
#include <share/network/eventframe/ClientBase.h>

class RobotManager;

// 子类实现 createConnection 函数
class ConnectorImpl : public Connector, CClientBase, IEventDispatcher {
public:
    ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params, const std::string& srv, RobotManager& robotManager);

    void init() override {
        CClientBase::SetEventDispatcher(this);
        INetInterface::net_config_t cfg = GetNetInterface()->GetConfig();
        cfg.m_max_conn_per_IP = 30000;
        cfg.m_skip_handshake = m_params.skipHandshake ? 1 : 0;
        GetNetInterface()->SetConfig(cfg);
    }

    void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, int idx, ConnectCallback&&) override;
protected:
    void OnNewLink(IEventLink *newlink) override;
    void OnConnFail(INetConnection *conn) override;
    void OnConnClose(IEventLink *link) override;
    bool DispatchEvent(IEventLink * link, IEvent * event) override;

    virtual std::shared_ptr<Connection> createConnection(IEventLink*, bool) = 0;
private:
    std::string m_serviceName;
    ConnectorParameters m_params;
    std::map<intptr_t, std::pair<ConnectCallback, int>>  m_cbs;

    // components
    RobotManager& m_robotManager;
};

//
#include <errors.h>
#include "connection_impl.h"
#include "robot_manager.h"
#include "logging.h"

inline ConnectorImpl::ConnectorImpl(IEventSelector *selector, const ConnectorParameters& params, const std::string& srv, RobotManager& robotManager) : 
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
    ), m_serviceName{srv}, m_robotManager{robotManager}, m_params{params} {}

inline void ConnectorImpl::connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, int idx, ConnectCallback&& cb) {
    BOOST_LOG_TRIVIAL(info) << "Connect: srv={}, addr={}, port={}, acc={}, idx={}"_format(m_serviceName, addr, port, acc, idx);

    auto c = CClientBase::Connect(addr.c_str(), port, acc.c_str(), pass.c_str());
    BOOST_LOG_TRIVIAL(debug) << "CClientBase::Connect returned conn is " << c;

    auto k = intptr_t(c);
    auto it = m_cbs.find(k);
    if (it != m_cbs.end()) {
        // 有个回调有相同的conn的指针，看起来不大可能
        BOOST_LOG_TRIVIAL(fatal) << "impossible!";
        BOOST_ASSERT(false);
    }
    m_cbs.insert(std::make_pair(k, std::make_pair(cb, idx)));
}

inline void ConnectorImpl::OnConnFail(INetConnection *conn) {
    const std::string acc{conn->GetAccountName()};

    BOOST_LOG_TRIVIAL(info) << "Connect FAILED: acc={}, conn={}"_format(acc, intptr_t(conn));

    auto it = m_cbs.find(intptr_t(conn));
    if (it == m_cbs.end()) {
        // log acc=xxx,level=warn blablabla...
        BOOST_LOG_TRIVIAL(warning) << "no callback for connect request: acc=" << acc;
        return;
    }
    auto cb = std::move(it->second);
    m_cbs.erase(it);
    cb.first(nullptr, whitebox::errc::CONNECT_FAILED, conn->GetErrorString());
}

inline void ConnectorImpl::OnNewLink(IEventLink *newlink) {
    auto rconn = newlink->GetConnection();
    std::string acc = rconn->GetAccountName();

    BOOST_LOG_TRIVIAL(info) << "Connect OK: newLink={}, conn={}"_format(intptr_t(newlink), intptr_t(rconn));

    auto it = m_cbs.find(intptr_t(rconn));
    if (it == m_cbs.end()) {
        // 没有发起的连接居然成功了，奇怪
        BOOST_LOG_TRIVIAL(fatal) << "impossible!";
        BOOST_ASSERT(false);
    }
    auto cb = std::move(it->second);
    m_cbs.erase(it);
    
    // 将conn保存起来留作后面使用
    // 保存在哪？应该在某个机器人的某个服务类别下
    // std::shared_ptr<Connection> pconn{new ConnectionImpl{newlink, m_params.shouldWrap}};
    auto pconn = createConnection(newlink, m_params.shouldWrap);
    m_robotManager.saveConnection(acc, m_serviceName, cb.second, pconn);

    newlink->SetPtr(pconn.get());

    // 这里把conn传递给回调似乎没啥用，以后删掉
    cb.first(pconn, std::error_code{}, "");
}

inline void ConnectorImpl::OnConnClose(IEventLink *link) {
    BOOST_LOG_TRIVIAL(info) << "connection closed: link=" << link << ", conn=" << link->GetConnection();

    // 服务器主动关闭了一个连接。怎么办？
    // 从机器人里面删除对应的？

    void* p = link->GetPtr();
    if (!p) {
        // 如果是null，那应该是相应的connection对象已经析构了。
        return;
    }
    Connection* pcon = static_cast<Connection*>(p);
    // 咋办？
    // 一种方案是，标记这个conn被关闭了，下次有人用的时候（比如机器人找连接）自然报错
    pcon->setClosed();
}

inline bool ConnectorImpl::DispatchEvent(IEventLink * link, IEvent * event) {
    // 处理收到的event
    BOOST_LOG_TRIVIAL(debug) << "ConnectorImpl::DispatchEvent: link=" << link << ", real_event=" << event->GetRealName() << ", event_name=" << event->GetEventName() << ", clsid=" << event->GetCLSID();

    auto conn = static_cast<ConnectionImpl*>(link->GetPtr());
    // 这里如果是null，说明对应的conn析构了
    // conn析构发生在robot析构中
    // BOOST_ASSERT(conn);
    if (!conn) {
        BOOST_LOG_TRIVIAL(trace) << "dispatch event but conn is null. link={:x}, conn={:x}"_format(intptr_t(link), intptr_t(link->GetConnection()));
        return false;
    }

    conn->onEvent(event);

    return true;

    // -- CEventEncryptEvList 这个消息表示应该加密的event，在这里处理掉算了，不需要让机器人去处理
}
