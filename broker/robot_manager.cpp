#include "robot_manager.h"
#include "robot.h"
#include <map>
#include <boost/assert.hpp>
#include <fruit/fruit.h>
#include "logging.h"

class RobotManagerImpl final : public RobotManager {
public:
    INJECT(RobotManagerImpl()) {}

    std::weak_ptr<Robot> findRobot(const std::string& acc) const override {
        auto it = m_robots.find(acc);
        if (it == m_robots.end()) {
            return std::weak_ptr<Robot>{};
        }

        return it->second;
    }

    void setupRobot(const std::string& acc, std::map<std::string, std::string>&& props) override {
        auto it = m_robots.find(acc);
        if (it != m_robots.end()) {
            BOOST_LOG_TRIVIAL(info) << "setupRobot: robot {} already exists, skip"_format(acc);
            return;
        }

        BOOST_LOG_TRIVIAL(info) << "setupRobot: account={}, sizeOfData={}"_format(acc, props.size());

        auto robot = createRobot(acc, std::move(props));
        m_robots.insert(std::make_pair(acc, robot));
    }

    void teardownRobot(const std::string& acc) override {
        auto it = m_robots.find(acc);
        if (it == m_robots.end()) {
            BOOST_LOG_TRIVIAL(info) << "teardownRobot FAILED: account not found: " << acc;
            return;
        }
        
        BOOST_LOG_TRIVIAL(info) << "teardownRobot: account=" << acc << ", use_count=" << it->second.use_count();
        m_robots.erase(it);
    }

    void saveConnection(const std::string& acc, const std::string& serviceName, int index, std::shared_ptr<Connection> conn) override {
        auto it = m_robots.find(acc);
        if (it == m_robots.end()) {
            // it = m_robots.insert(std::make_pair(acc, createRobot(acc))).first;
            BOOST_ASSERT_MSG(false, "robot has not bean setup");
        }

        auto& robot = it->second;

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