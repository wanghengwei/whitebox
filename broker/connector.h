#pragma once
#include <string>

struct ConnectorParameters {
    bool isTrusted{true};
    bool skipHandshake{true};
};

class Connector {
public:
    virtual ~Connector() {}

    virtual void connect(const std::string& addr, uint16_t port, const std::string& acc, const std::string& pass) = 0;
};
