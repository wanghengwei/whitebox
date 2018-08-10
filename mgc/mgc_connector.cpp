#include "mgc_connector.h"
#include "mgc_connection.h"

std::shared_ptr<Connection> MGCConnector::createConnection(IEventLink* link, bool wrap) {
    return std::shared_ptr<Connection>{new MGCConnection{link, wrap}};
}
