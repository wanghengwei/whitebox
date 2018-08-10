#include <connector_impl.h>

class MGCConnector final : public ConnectorImpl {
public:
    MGCConnector(IEventSelector *selector, const ConnectorParameters& params, const std::string& srv, RobotManager& robotManager) : ConnectorImpl{selector, params, srv, robotManager} {}
private:
    std::shared_ptr<Connection> createConnection(IEventLink* link, bool) override;
};