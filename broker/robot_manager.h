#pragma once
#include <string>
#include <memory>
#include <map>
#include <chrono>
#include <fruit/fruit_forward_decls.h>

class Robot;
class Connection;

class RobotManager {
public:
    virtual ~RobotManager() {}

    // 根据帐号找到机器人。没找到就返回null
    virtual std::weak_ptr<Robot> findRobot(const std::string& acc) const = 0;

    // 初始化一个robot
    virtual void setupRobot(const std::string& acc, std::map<std::string, std::string>&& props) = 0;
    virtual void teardownRobot(const std::string& acc) = 0;

    // 保存一个conn到某个robot下
    virtual void saveConnection(const std::string& acc, const std::string& serviceName, int index, std::shared_ptr<Connection> conn) = 0;

    // 定时执行动作
    // 比如目前有清理超时回调的工作需要周期性判断
    virtual void update(const std::chrono::system_clock::time_point& now) = 0;
};

fruit::Component<RobotManager> getRobotManager();