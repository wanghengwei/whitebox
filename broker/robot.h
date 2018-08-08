#pragma once
#include <memory>
#include <map>
#include <chrono>

class Connection;

class Robot {
public:
    virtual ~Robot() {}

    virtual const std::string& account() const = 0;

    virtual std::weak_ptr<Connection> findConnection(const std::string& serviceName, int connectionIndex) = 0;

    virtual void saveConnection(const std::string& serviceName, int connectionIndex, std::shared_ptr<Connection> conn) = 0;

    virtual std::string getProperty(const std::string& key) const = 0;

    virtual void update(const std::chrono::system_clock::time_point& now) = 0;
};

std::shared_ptr<Robot> createRobot(std::string acc, std::map<std::string, std::string>&& props);