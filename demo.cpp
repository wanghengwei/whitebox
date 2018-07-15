/* Define Action:

# file CEventLogin.yml
name: CEventLogin
init:
    fields:
    - name: m_foo
      constant: 2
    - name: m_bar
      playerData:
        key: PlayerDataBar
        type: string

this will generating code:
# AUTOGEN CEventLogin.cpp
void prepareCEventLogin(CEventLogin& ev) {
    ev.m_foo = 2;
    ev.m_bar = player.getData<string>("PlayerDataBar");
}

# AUTOGEN proto:
service Broker {
    ...

    rpc sendCEventLogin(Params) return (Result)

    ...
}

# AUTOGEN proto impl
class BrokerImpl {
    void sendCEventLogin(params) {
        ...
    }
}

*/

/* TestCase:

# testcase.xml
...
<connect conn="User"/>
<send name="CEventLogin" conn="User"/>
<recv name="CEventLoginRes" conn="User"/>
...

# in c++:

// impl of gRPC
void sendCEventLogin(CEventLoginParams) {
    auto name = ...;
    auto ev = eventManager.createEvent(name)
    auto conn = connectionManager.getConnection(connName);
    conn.sendEvent(&ev);
    return Results::OK;
}

void recvEventAction() {
    auto conn = ...;
    conn.getRecvEvents().filter(e -> e.name == eventName).map(e -> ??).subscribe(??);
    return;
}

# proto

message Result {
    int errorCode
    string errorMessage
    string category
}

service Broker {
    rpc sendCEventLogin(CEventLoginParams)
}


# in nodejs:
# action caller

function sendEventAction(xmlNode) {
    let eventName = ...;
    let connId = ...;
    // gRPC has no method overload
    let f = getFunction("broker.send${eventName}");
    f({xx: "XX"});
    return just(Ok);
}

function recvEventAction(xmlNode) {
    let eventName = ...;
    let connId = ...;
    let f = getFunc("broker.recv${eventName}");
    
}

*/