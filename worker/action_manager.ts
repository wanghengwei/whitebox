import { readFileSync } from "fs";
import { safeLoadAll } from 'js-yaml';
import * as action from "./action";
import * as ev from './event';

// 用来提供event的信息。信息来自于解析yml定义。
// yml哪里来……还不知道，目前就从本地文件读。
interface ActionManager {
    findAction(actionType: action.Order, actionName: string): action.Action;

    findEvent(eventOrder: ev.Order, eventRef: string): ev.Event

    actions: action.Action[];

    events: ev.Event[];
}

class LocalFileActionManager implements ActionManager {
    actions: action.Action[] = [];
    events: ev.Event[] = [];

    constructor() {
        safeLoadAll(readFileSync("../actions.yaml").toString(), doc => {
            if (doc.class == 'Action') {
                this.actions.push(new (action['Action' + doc.order])(doc));
            } else if (doc.class == 'Event') {
                let e = new (ev['Event' + doc.order])(doc);
                this.events.push(e);
            }
        });
    }

    findAction(actionType: action.Order, actionName: string): action.Action {
        return this.actions.find(v => v.name() == actionName && v.order() == actionType);
    }

    findEvent(eventOrder: ev.Order, eventRef: string): ev.Event {
        return this.events.find(e => e.order() == eventOrder && e.name() == eventRef);
    }
}

const actionManager: ActionManager = new LocalFileActionManager();

export default actionManager;
export { Order as ActionOrder } from './action';
export { Order as EventOrder } from './event';