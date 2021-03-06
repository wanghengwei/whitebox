import { CompositeActivity } from "./composite";
import { Observable } from "rxjs";
import { repeat } from "rxjs/operators";
import { ActionResult } from "../activity";

export class LoopActivity extends CompositeActivity {
    loopCount: number = -1;
    // tag: string = "";

    parse(data: any): void {
        this.loopCount = Number(data["@_count"]) || -1;
        this.tag = data["@_tag"];
        super.parse(data);
    }

    proceed(ctx: any): Observable<ActionResult> {
        return super.proceed(ctx).pipe(repeat(this.loopCount));
    }
}
