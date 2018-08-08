#include "robot.h"
#include <map>
#include <boost/assert.hpp>
#include "connection.h"

class RobotImpl final : public Robot {
public:
    explicit RobotImpl(std::string acc, std::map<std::string, std::string>&& props) : m_acc{acc}, m_props{std::move(props)} {}

    RobotImpl(RobotImpl&) = delete;
    RobotImpl& operator=(RobotImpl&) = delete;

    const std::string& account() const override {
        return m_acc;
    }

    std::weak_ptr<Connection> findConnection(const std::string& serviceName, int connectionIndex) override {
        auto it = m_conns.find(serviceName);
        if (it == m_conns.end()) {
            return std::weak_ptr<Connection>{};
        }

        auto it2 = it->second.find(connectionIndex);
        if (it2 == it->second.end()) {
            return std::weak_ptr<Connection>{};
        }

        // 检查连接是不是被关闭了
        if (it2->second->isClosed()) {
            it->second.erase(it2);
            return std::weak_ptr<Connection>{};
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
            // 说明之前连接过而且连上了，算错误吗？
            BOOST_ASSERT_MSG(false, "connection index duplicated");
        }
    }

    std::string getProperty(const std::string& key) const override {
        auto it = m_props.find(key);
        if (it == m_props.end()) {
            return "";
        }

        return it->second;
    }

    void update(const std::chrono::system_clock::time_point& now) override {
        for (auto& s: m_conns) {
            for (auto& c : s.second) {
                c.second->update(now);
            }
        }
    }
private:
    std::string m_acc;

    // 每个机器人按 (service, index) 的方式保存连接
    std::map<std::string, std::map<int, std::shared_ptr<Connection>>> m_conns;

    std::map<std::string, std::string> m_props;
};

std::shared_ptr<Robot> createRobot(std::string acc, std::map<std::string, std::string>&& props) {
    return std::shared_ptr<Robot>{new RobotImpl{acc, std::move(props)}};
}
