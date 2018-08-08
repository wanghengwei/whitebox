// action 表示一个动作，即机器人一直以来的动作的概念，比如发送一个event

export enum Order {
    SendEvent = "SendEvent",
    RecvEvent = "RecvEvent",
    SendRecvEvent = "SendRecvEvent",
}

export abstract class Action {

    constructor(protected doc: any) { }

    order(): Order {
        return this.doc.order;
    }

    name(): string {
        let name = this.doc.metadata ? this.doc.metadata.name : null;
        if (name) {
            return name;
        }

        return this.getNameFromEvent();
    }

    fullName(): string {
        return this.constructor.name + this.name();
    }

    protected abstract getNameFromEvent(): string;

    // 从total里面摘选出当前动作需要发送的玩家数据。
    abstract projectPlayerData(total: any): any;

    headerFileName(): string {
        return `${this.fullName()}.h`;
    }

    cppFileName(): string {
        return `${this.fullName()}.cpp`;
    }

    outputFileNames(): string[] {
        return [this.headerFileName(), this.cppFileName()];
    }
}


import actionManager from './action_manager';
import * as ev from './event';

export class ActionSendRecvEvent extends Action {

    getNameFromEvent(): string {
        return this.doc.spec.send.eventRef;
    }

    projectPlayerData(total: any): any {
        let e = actionManager.findEvent(ev.Order.Request, this.doc.spec.send.eventRef) as ev.EventRequest;
        let keys = e.playerDataKeys();
        // logger.debug({ ref: this.doc.spec, event: e, keys, total }, "find event")
        let res = {};
        for (let [k, v] of Object.entries(total)) {
            if (keys.indexOf(k) > -1) {
                res[k] = String(v);
            }
        }
        return res;

    }

}

export class ActionSendEvent extends Action {

    getNameFromEvent(): string {
        return this.doc.spec.eventRef;
    }

    projectPlayerData(total: any): any {
        let e = actionManager.findEvent(ev.Order.Request, this.doc.spec.eventRef) as ev.EventRequest;
        let keys = e.playerDataKeys();
        let res = {};
        for (let [k, v] of Object.entries(total)) {
            if (k in keys) {
                res[k] = String(v);
            }
        }
        return res;
    }

}

export class ActionRecvEvent extends Action {
    protected getNameFromEvent(): string {
        return this.doc.spec.eventRefs[0];
    }

    projectPlayerData(total: any): any {
        return {};
    }
}