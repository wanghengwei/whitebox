#pragma once
#include <string>
#include <memory>
#include <fruit/fruit_forward_decls.h>

class Robot;
class Connection;

class RobotManager {
public:
    virtual ~RobotManager() {}

    // 根据帐号找到机器人。没找到就返回null
    virtual std::shared_ptr<Robot> findRobot(const std::string& acc) = 0;

    virtual void saveConnection(const std::string& acc, const std::string& serviceName, int index, std::shared_ptr<Connection> conn) = 0;
};

fruit::Component<RobotManager> getRobotManager();