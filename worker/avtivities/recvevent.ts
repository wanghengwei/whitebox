import { SimpleActivity } from "./simple";
import { Observable, bindNodeCallback } from "rxjs";
import broker from "../broker";
import { map } from "rxjs/operators";
import { ActionResult } from "../activity";
import logger from "../logger";

export class RecvActionActivity extends SimpleActivity {
    event: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => {
            logger.info({ action_name: this.event, args }, `RecvEvent ${this.event}`);
            let cb2 = (err, res) => {
                if (err) {
                    logger.fatal({ grpc_error: err }, `RecvEvent ${this.event} FAILED`);
                } else if (res.error) {
                    if (this.onErrorHandler != 'ignore') {
                        logger.error({ error: res.error }, `RecvEvent ${this.event} FAILED`);
                    } else {
                        logger.warn({ error: res.error }, `RecvEvent ${this.event} FAILED`);
                    }
                } else {
                    logger.info({ action_name: this.event, args, result: res }, `RecvEvent ${this.event} OK`);
                }

                // logger.info({action_name: this.event, args, result: res, grpc_error: err}, `SendEvent ${this.event} DONE`)
                cb(err, res);
            };

            broker[`ActionRecvEvent${this.event}`](arg, cb2);
        };
        let args = {
            connectionId: {
                account: ctx.robot.account,
                service: this.service,
                index: this.connectionIndex,
            },
            data: {}
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
