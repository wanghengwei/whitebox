import { SimpleActivity } from "./simple";
import { Observable, bindNodeCallback } from "rxjs";
import broker from "../broker";
import { map } from "rxjs/operators";
import { Result } from "../activity";


class SendEventMetadata {
    type: string = 'send';

    constructor(public event: string, public args: any) { }
}

export class SendActionActivity extends SimpleActivity {
    event: string = "";
    service: string = "";
    connectionIndex: number = 0;

    doProceed(ctx: any): Observable<any> {
        let f = (arg, cb) => broker[`Send${this.event}`](arg, cb);
        let args = {
            account: ctx.robot.account,
            service: this.service,
            index: this.connectionIndex,
        };
        return bindNodeCallback(f)(args).pipe(
            map((x: any) => new Result(new SendEventMetadata(this.event, args), x.error)),
        );
    }

    doParse(data: any): void {
        this.event = data['@_name'];
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
    }
}
