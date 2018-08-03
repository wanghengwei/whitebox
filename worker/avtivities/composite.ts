import { from, Observable, concat, of, timer } from "rxjs";
import { map, concatAll, catchError, ignoreElements } from "rxjs/operators";
import { Activity } from "../activity";
import { RestartError, ContinueError } from "../errors";
import logger from "../logger";

export class CompositeActivity implements Activity {
    activities: Array<Activity> = [];
    tag: string = "";
    // 表示是否是根节点。用于处理一些逻辑，比如restart的on_error handler
    isRoot: boolean;

    constructor(isRoot: boolean = false) {
        this.isRoot = isRoot;
    }

    parse(data: any): void {
        let actions = data.action;
        if (!Array.isArray(actions)) {
            if (actions == undefined) {
                actions = [];
            } else {
                actions = [actions];
            }
        }

        actions.forEach((x: any) => {
            let t = x["@_type"];
            let act = createActivityByType(t);

            if (act == null) {
                return;
            }

            act.parse(x);
            this.activities.push(act);
        });

        // logger.info({ actions: this.activities }, "parse done")
    }

    proceed(ctx: any): Observable<any> {
        // 如果某个act的postprocessor是continue且条件满足，那么就应当终止队列，然后：
        // 根据tag找到要重新执行的loop或composite
        // 只有能产生一个结果的act才能有这种postprocessor。sleep、echo、loop这些都不行。

        // 除了takeWhile，还可以：让act在生成Result时产生错误来终止队列。
        return from(this.activities).pipe(
            // --act--act--act-->
            map(act => {
                return act.proceed(ctx);
            }),
            // --[rez]--[rez]--[rez]-->
            concatAll(),
            // --rez--rez--rez-->
            // 如果某个rez的postprocessor满足某种条件，那么就应当终止队列
            // 如果error是Continue，那么不应当简单当作error，而是重头执行
            catchError((err, caught) => {
                // logger.info({catch: err}, `catched an error. isRoot=${this.isRoot}`);
                // 如果错误是restart，那就一直抛给root节点处理
                if (err instanceof RestartError && this.isRoot) {
                    logger.info("restart...");
                    // 延迟一段时间再restart。最好是可配
                    return concat(of(err.lastResult), timer(5000).pipe(ignoreElements()), caught);
                }

                // 如果错误是continue，并且声明了要continue的是当前复合节点，那么就重新执行队列
                if (err instanceof ContinueError && err.tag == this.tag) {
                    return caught;
                }

                // 其它错误不管，抛出完事。
                throw err;
            }),
        );
    }
}

import { SleepActivity } from "./sleep";
import { ConnectActionActivity } from "./connect";
import { SendRecvEventActivity } from "./sendrecvevent";
import { LoopActivity } from "./loop";
import { EchoActivity } from "./echo";
import { SelectActivity } from "./select";
import { SendActionActivity } from "./sendevent";
import { RecvActionActivity } from "./recvevent";

function createActivityByType(t: string): Activity {
    let act = null;
    if (t == "sleep") {
        act = new SleepActivity();
    } else if (t == "loop") {
        act = new LoopActivity();
    } else if (t == "echo") {
        act = new EchoActivity();
    } else if (t == "select") {
        act = new SelectActivity();
    } else if (t == 'connect') {
        act = new ConnectActionActivity();
    } else if (t == 'send') {
        act = new SendActionActivity();
    } else if (t == 'recv') {
        act = new RecvActionActivity();
    } else if (t == 'SendRecvEvent') {
        act = new SendRecvEventActivity();
    }

    return act;
}