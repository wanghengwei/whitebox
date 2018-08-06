import { SimpleActivity } from "./simple";
import { Observable, of, empty } from "rxjs";
import { tap } from "rxjs/operators";
import logger from "../logger";

export class EchoActivity extends SimpleActivity {
    message: string = "";
    // postprocessor?: PostProcessor;

    doParse(data: any): void {
        this.message = data["@_message"];
        this.delayTime = 1000;
    }

    doProceed(ctx: any): Observable<any> {
        return empty().pipe(
            tap(undefined, undefined, () => {
                logger.info(this.message);
            })
        );
    }
}
