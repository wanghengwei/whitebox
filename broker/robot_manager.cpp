#include "robot_manager.h"
#include <map>
#include <fruit/fruit.h>
#include "robot.h"

class RobotManagerImpl final : public RobotManager {
public:
    INJECT(RobotManagerImpl()) {}

    std::shared_ptr<Robot> findRobot(const std::string& acc) override {
        auto it = m_robots.find(acc);
        if (it == m_robots.end()) {
            return nullptr;
        }

        return it->second;
    }

    void saveConnection(const std::string& acc, const std::string& serviceName, int index, std::shared_ptr<Connection> conn) override {
        auto it = m_robots.find(acc);
        if (it == m_robots.end()) {
            it = m_robots.insert(std::make_pair(acc, createRobot(acc))).first;
        }

        auto& robot = it->second;

        // auto conn = robot->findConnection(serviceName, index);
        // if (conn) {
        //     // 错误！
        //     BOOST_ASSERT_MSG(false, "connection index duplicated");
        // }

        robot->saveConnection(serviceName, index, conn);
    }
private:
    std::map<std::string, std::shared_ptr<Robot>> m_robots;
};

fruit::Component<RobotManager> getRobotManager() {
    return fruit::createComponent()
        .bind<RobotManager, RobotManagerImpl>()
    ;
}