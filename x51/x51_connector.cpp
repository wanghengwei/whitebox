#include "x51_connector.h"
#include "x51_connection.h"

std::shared_ptr<Connection> X51Connector::createConnection(IEventLink* link, bool) {
    return std::shared_ptr<Connection>{new X51Connection{link}};
}
