#include "connect_async_call.h"
#include "async_call_impl.h"
#include "connector_manager.h"
#include "errors.h"
#include "connector.h"
#include "logging.h"

// 用于连接服务器的异步操作
class ConnectAsyncCall final : public AsyncCallImpl<ConnectAsyncCall, ConnectParams, Result> {
public:
    ConnectAsyncCall(
        Server& svr,
        ConnectorManager& cm
    ) :
        AsyncCallImpl{svr},
        m_connectorManager{cm}
    {}

protected:

    AsyncRequestMethod getRequestMethod() const override {
        return &::Broker::AsyncService::RequestConnect;
    }

    AsyncCall* createNewInstance() override {
        return createConnectAsyncCall(server(), m_connectorManager);
    }

    void doReply() override {
        std::string addr = request().address();
        uint16_t port = request().port();
        auto connId = request().connectionid();
        std::string pass = request().password();

        BOOST_LOG_TRIVIAL(debug) << "find connector for " << connId.service();

        // 真正发起连接。需要找到对应服务的Connector
        auto connector = m_connectorManager.findConnector(connId.service());
        if (!connector) {
            // 没有找到服务，无法连接

            std::string msg = "no connector for {}"_format(connId.service());

            BOOST_LOG_TRIVIAL(warning) << msg;

            auto e = reply().mutable_error();
            e->set_errorcode(int(whitebox::errc::CONNECT_FAILED));
            e->set_errorcategory(whitebox::ERROR_CATEGORY);
            e->set_message(msg);
            // m_responder.Finish(m_reply, grpc::Status::OK, this);
            finish();

            return;
        }

        // 找到connector了，开始发起连接
        // BOOST_LOG_TRIVIAL(info) << "Connect: addr=" << addr << ", port=" << port << ", acc=" << connId.account();
        // BOOST_LOG_TRIVIAL(info) << "Connect: srv={}, addr={}, port={}, acc={}, idx={}"_format(connId.service(), addr, port, connId.account(), connId.connectionIndex());

        connector->connect(addr, port, connId.account(), pass, connId.index(), [this](std::shared_ptr<Connection> conn, const std::error_code& ec, const std::string& msg) {
            // 向grpc报告最终的结果
            if (ec) {
                auto e = reply().mutable_error();
                e->set_errorcode(ec.value());
                e->set_errorcategory(ec.category().name());
                e->set_message(msg);
            }
            // m_responder.Finish(m_reply, grpc::Status::OK, this);
            finish();
        });
    }
private:
    ConnectorManager& m_connectorManager;
};


AsyncCall* createConnectAsyncCall(Server& svr, ConnectorManager& cm) {
    return new ConnectAsyncCall{svr, cm};
}
