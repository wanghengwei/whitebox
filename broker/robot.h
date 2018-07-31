#pragma once
#include <memory>

class Connection;

class Robot {
public:
    virtual ~Robot() {}

    virtual std::shared_ptr<Connection> findConnection(const std::string& serviceName, int connectionIndex) = 0;

    virtual void saveConnection(const std::string& serviceName, int connectionIndex, std::shared_ptr<Connection> conn) = 0;
};

std::shared_ptr<Robot> createRobot(std::string acc);