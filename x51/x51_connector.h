#include <connector_impl.h>

class X51Connector final : public ConnectorImpl {
public:
    X51Connector(IEventSelector *selector, const ConnectorParameters& params, const std::string& srv, RobotManager& robotManager) : ConnectorImpl{selector, params, srv, robotManager} {}
private:
    std::shared_ptr<Connection> createConnection(IEventLink* link, bool) override;
};