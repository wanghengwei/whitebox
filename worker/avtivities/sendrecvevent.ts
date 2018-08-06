import { bindNodeCallback, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ActionResult } from "../activity";
import broker from "../broker";
import logger from "../logger";
import { SimpleActivity } from "./simple";


// class SendRecvEventMetadata {
//     type: string = "SendRecvEvent";

//     constructor(public args: any, public name: string) { }
// }

export class SendRecvEventActivity extends SimpleActivity {
    name: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => {
            // 打印不出来具体的一些参数，比如怎么填event的，这样不大好。以后改掉
            logger.info({ action_name: this.name, args }, `SendRecvEvent`)
            let cb2 = (error, result) => {
                logger.info({ action_name: this.name, args, result, rpc_error: error }, "SendRecvEvent DONE")
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
            // 这里的x是grpc返回的结果，类型是Result(proto里的)
            map((x: any) => new ActionResult(x, { name: this.name }, args)),
        );
    }

    doParse(data: any): void {
        // this.sendEvent = data['@_send'];
        this.name = data['@_name'];
        // this.recvEvent = data['@_recv'];
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
    }
}
