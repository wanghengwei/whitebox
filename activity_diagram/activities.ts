import { Observable, timer, from, empty, of, concat } from 'rxjs';
import { map, flatMap, tap, repeat, concatAll, ignoreElements, takeUntil, catchError, delay, filter } from 'rxjs/operators';

import { PostProcessor, ContinuePostProcessor } from './postprocessors';
import { ContinueError } from './errors';
import logger from './logger';

interface Result {

}


class SimpleResult implements Result {

}

interface Activity {
    // postprocessor?: PostProcessor;

    parse(data: any): void;

    // 每个act执行结果不一定是一个结果，因为有类似loop这种act存在。
    proceed(): Observable<Result>;
}

// 表示简单act，只返回最多一个结果的。和loop那种不一样。
// 子类应该实现doParse & doProceed
abstract class SimpleActivity implements Activity {
    postprocessor?: PostProcessor;
    delayTime: number = 0;

    parse(data: any): void {
        this.parsePostprocessor(data.postprocessor);
        this.doParse(data);
    }

    proceed(): Observable<Result> {
        return this.doProceed().pipe(
            // 后置处理
            // 要求所有act都要返回点东西，不能是empty
            map((x, idx) => {
                if (!this.postprocessor) {
                    return x;
                }

                return this.postprocessor.invoke(x, idx);
            }),
            // 延迟执行
            delay(this.delayTime),
            filter(x => x instanceof SimpleResult),
        );
    }

    abstract doProceed(): Observable<Result>;

    abstract doParse(data: any): void;

    parsePostprocessor(data: any): void {
        // 解析postprocessor
        if (data) {
            let pp = null;
            if (data['@_type'] == 'continue') {
                pp = new ContinuePostProcessor();
            }

            if (pp) {
                pp.parse(data);
                this.postprocessor = pp;
            }
        }

    }
}

// // 加入执行前等待的功能。子类实现doProceed方法。
// abstract class DelayedAbstractActivity extends AbstractActivity {
//     proceed(): Observable<Result> {
//         return this.doProceed().pipe(delay(1000));
//     }

//     abstract doProceed(): Observable<Result>;
// }

class SleepActivity extends SimpleActivity {
    sleepMilliseconds: number = 0;

    doParse(data: any): void {
        let sec = Number(data['@_seconds']) || 0;
        this.delayTime = sec * 1000;
    }

    doProceed(): Observable<Result> {
        return of(true).pipe(
            tap(undefined, undefined, () => {
                logger.info(`sleep ${this.sleepMilliseconds}ms DONE`);
            }),
        );
    }
}

export class CompositeActivity implements Activity {
    activities: Array<Activity> = [];
    tag: string = "";

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
            let t = x['@_type'];
            let act = null;
            if (t == "sleep") {
                act = new SleepActivity();
            } else if (t == 'loop') {
                act = new LoopActivity();
            } else if (t == 'echo') {
                act = new EchoActivity();
            }

            if (act == null) {
                return;
            }

            act.parse(x);
            this.activities.push(act);
        });

        // logger.info({ actions: this.activities }, "parse done")
    }

    proceed(): Observable<Result> {
        // 如果某个act的postprocessor是continue且条件满足，那么就应当终止队列，然后：
        // 根据tag找到要重新执行的loop或composite
        // 只有能产生一个结果的act才能有这种postprocessor。sleep、echo、loop这些都不行。

        // 除了takeWhile，还可以：让act在生成Result时产生错误来终止队列。
        return from(this.activities).pipe(
            // --act--act--act-->
            map(act => {
                return act.proceed();
            }),
            // --[rez]--[rez]--[rez]-->
            concatAll(),
            // --rez--rez--rez-->
            // 如果某个rez的postprocessor满足某种条件，那么就应当终止队列
            // 如果error是Continue，那么不应当简单当作error，而是重头执行
            catchError((err, caught) => {
                if (err instanceof ContinueError && err.tag == this.tag) {
                    return caught;
                }

                throw err;
            }),

        )
    }
}

class LoopActivity extends CompositeActivity {
    loopCount: number = -1;
    // tag: string = "";

    parse(data: any): void {
        this.loopCount = Number(data['@_count']) || -1;
        this.tag = data['@_tag'];
        super.parse(data);
    }

    proceed(): Observable<Result> {
        return super.proceed().pipe(
            repeat(this.loopCount),
        );
    }
}

class EchoActivity extends SimpleActivity {
    message: string = "";
    // postprocessor?: PostProcessor;

    doParse(data: any): void {
        this.message = data['@_message'];
        this.delayTime = 1000;
    }

    doProceed(): Observable<Result> {
        return of(this.message).pipe(
            tap(t => {
                logger.info(t);
            }),
        );
    }
}
