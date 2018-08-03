import { Result } from "../activity";
import { Observable, bindNodeCallback } from "rxjs";
import logger from "../logger";
import broker from "../broker";
import { map } from "rxjs/operators";
import { SimpleActivity } from "./simple";


class SendRecvEventMetadata {
    type: string = "SendRecvEvent";

    constructor(public args: any, public send: string, public recv: Array<string>) { }
}

export class SendRecvEventActivity extends SimpleActivity {
    name: string = "";
    sendEvent: string = "";
    recvEvent: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => {
            logger.info({ send: this.sendEvent, recv: this.recvEvent, args }, "SendRecvEvent")
            let cb2 = (error, result) => {
                logger.info({ send: this.sendEvent, recv: this.recvEvent, args, result, rpc_error: error }, "SendRecvEvent DONE")
                cb(error, result);
            };
            // 注意这里要拼成完整名字：类型+name  
            broker[`ActionSendRecvEvent${this.name}`](arg, cb2);
        };
        // 设置调用rpc的参数
        let args = {
            connectionId: {
                account: ctx.robot.account,
                service: this.service,
                index: this.connectionIndex,
            },
            data: {}
        };
        return bindNodeCallback(f)(args).pipe(
            map((x: any) => new Result(new SendRecvEventMetadata(args, this.sendEvent, [this.recvEvent]), x.error)),
        );
    }

    doParse(data: any): void {
        this.sendEvent = data['@_send'];
        this.name = data['@_name'] || this.sendEvent;
        this.recvEvent = data['@_recv'];
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
    }
}
