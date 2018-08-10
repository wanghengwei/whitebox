import { SimpleActivity } from "./simple";
import { Observable, bindNodeCallback } from "rxjs";
import * as broker from "../broker";
import { map } from "rxjs/operators";
import { ActionResult } from "../activity";
import logger from "../logger";


// class SendEventMetadata {
//     type: string = 'send';

//     constructor(public name: string, public args: any) { }
// }

export class SendActionActivity extends SimpleActivity {
    event: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => {
            logger.info({ action_name: this.event, args }, `SendEvent ${this.event}`);

            let cb2 = (err, res) => {
                if (err) {
                    logger.fatal({ grpc_error: err }, `SendEvent ${this.event} FAILED`);
                } else if (res.error) {
                    if (this.onErrorHandler != 'ignore') {
                        logger.error({ error: res.error }, `SendEvent ${this.event} FAILED`);
                    } else {
                        logger.warn({ error: res.error }, `SendEvent ${this.event} FAILED`);
                    }
                } else {
                    logger.info({ action_name: this.event, args, result: res }, `SendEvent ${this.event} OK`);
                }

                // logger.info({action_name: this.event, args, result: res, grpc_error: err}, `SendEvent ${this.event} DONE`)
                cb(err, res);
            };
            broker.brokerService[`ActionSendEvent${this.event}`](arg, cb);
        };
        let args = {
            connectionId: {
                account: ctx.robot.account,
                service: this.service,
                index: this.connectionIndex,
            },
            data: {},
        };
        return bindNodeCallback(f)(args).pipe(
            map((x: any) => new ActionResult(x, { name: this.event }, args)),
        );
    }

    doParse(data: any): void {
        this.event = data['@_name'];
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
    }
}
