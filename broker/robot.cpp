#include "robot.h"
#include <map>
#include <boost/assert.hpp>

class RobotImpl final : public Robot {
public:
    explicit RobotImpl(std::string acc) : m_acc{acc} {}

    RobotImpl(RobotImpl&) = delete;
    RobotImpl& operator=(RobotImpl&) = delete;

    std::shared_ptr<Connection> findConnection(const std::string& serviceName, int connectionIndex) override {
        auto it = m_conns.find(serviceName);
        if (it == m_conns.end()) {
            return nullptr;
        }

        auto it2 = it->second.find(connectionIndex);
        if (it2 == it->second.end()) {
            return nullptr;
        }

        return it2->second;
    }

    void saveConnection(const std::string& serviceName, int connectionIndex, std::shared_ptr<Connection> conn) override {
        auto it = m_conns.find(serviceName);
        if (it == m_conns.end()) {
            m_conns[serviceName][connectionIndex] = conn;
            return;
        }

        auto& m = it->second;
        auto r = m.insert(std::make_pair(connectionIndex, conn));
        if (!r.second) {
            // fatal error!
            BOOST_ASSERT_MSG(false, "connection index duplicated");
        }
    }
private:
    std::string m_acc;

    std::map<std::string, std::map<int, std::shared_ptr<Connection>>> m_conns;
};

std::shared_ptr<Robot> createRobot(std::string acc) {
    return std::shared_ptr<Robot>{new RobotImpl{acc}};
}
