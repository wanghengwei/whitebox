const {broker} = require('./broker');

class ConnectAction {
    run = (params) => {
        broker.Connect(params, (err, resp) => {});
    }
}

class XMLActionFactory {
    createAction = (xmlNode) => {
        let name = xmlNode.name;

        let action;

        switch (name) {
            case "connect":
                action = new ConnectAction();
                break;
            case "send":
                break;
            case "recv":
                break;
            default:
                break;
        }

        return action;
    }
}