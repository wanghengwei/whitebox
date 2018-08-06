#pragma once
#include <string>
#include <memory>
#include <functional>
#include <system_error>

class Connection;

struct ConnectorParameters {
    bool isTrusted{true};
    bool skipHandshake{true};
    bool shouldWrap{false}; // 是否要wrap消息。mgc专用的
};

using ConnectCallback = std::function<void(std::shared_ptr<Connection>, const std::error_code&, const std::string&)>;

class Connector {
public:
    virtual ~Connector() {}

    virtual void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, int idx, ConnectCallback&&) = 0;
};
