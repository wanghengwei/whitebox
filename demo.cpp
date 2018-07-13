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
# CEventLogin.cpp
void prepareCEventLogin(CEventLogin& ev) {
    ev.m_foo = 2;
    ev.m_bar = player.getData<string>("PlayerDataBar");
}

*/

/* TestCase:

# testcase.xml
...
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
    return conn.getRecvEvents().filter(e -> e.name == eventName).map(e -> ??);
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