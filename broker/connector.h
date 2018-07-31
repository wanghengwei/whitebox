#pragma once
#include <string>
#include <memory>
#include <functional>
#include <system_error>

struct ConnectorParameters {
    bool isTrusted{true};
    bool skipHandshake{true};
};

class Connection;

using ConnectCallback = std::function<void(std::shared_ptr<Connection>, const std::error_code&, const std::string&)>;

class Connector {
public:
    virtual ~Connector() {}

    virtual void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass, ConnectCallback&&) = 0;
};
