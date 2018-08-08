import { bindNodeCallback, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ActionResult } from "../activity";
import broker from "../broker";
import logger from "../logger";
import { SimpleActivity } from "./simple";
import actionManager, { ActionOrder } from '../action_manager';

export class SendRecvEventActivity extends SimpleActivity {
    // 动作名
    name: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => {
            // 打印不出来具体的一些参数，比如怎么填event的，这样不大好。以后改掉
            logger.info({ action_name: this.name, args }, `SendRecvEvent ${this.name}`)
            let cb2 = (error, result) => {
                if (error) {
                    logger.fatal({ grpc_error: error }, `SendRecvEvent ${this.name} FAILED`);
                } else if (result.error) {
                    if (this.onErrorHandler != 'ignore') {
                        logger.error({ error: result.error }, `SendRecvEvent ${this.name} FAILED`);
                    } else {
                        logger.warn({ error: result.error }, `SendRecvEvent ${this.name} FAILED`);
                    }
                } else {
                    logger.info({ action_name: this.name, args, result }, `SendRecvEvent ${this.name} OK`);
                }

                cb(error, result);
            };
            // 注意这里要拼成完整名字：类型+name  
            broker[`ActionSendRecvEvent${this.name}`](arg, cb2);
        };

        // 设置调用rpc的参数
        // 需要从动作名找出要放入哪些params
        let act = actionManager.findAction(ActionOrder.SendRecvEvent, this.name);
        let data = act.projectPlayerData(ctx.robot.playerData);
        // logger.debug({ data }, 'get data!');
        let args = {
            connectionId: {
                account: ctx.robot.account,
                service: this.service,
                index: this.connectionIndex,
            },
            data,
        };
        return bindNodeCallback(f)(args).pipe(
            // 这里的x是grpc返回的结果，类型是Result(proto里的)
            map((x: any) => {
                // 把返回的用户数据存入playerData
                if (x.data) {
                    let data = x.data.data;
                    ctx.robot.putPlayerData(data);
                }
                return new ActionResult(x, { name: this.name }, args);
            }),
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
