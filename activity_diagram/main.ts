import pino from 'pino';
import { parse } from 'fast-xml-parser';
import 'fs';
import { readFile } from 'fs';
import { Observable, timer, from, empty, of } from 'rxjs';
import { map, flatMap, tap, repeat, concatAll, ignoreElements, takeUntil, catchError } from 'rxjs/operators';
import ts from 'typescript';

const logger = pino({ prettyPrint: true });

readFile(`${__dirname}/../demo.xml`, (err, data) => {
    let obj = parse(data.toString(), { ignoreAttributes: false });
    // logger.info({obj: obj}, "parse file DONE");

    let ca = new CompositeActivity();
    ca.parse(obj.test_case.template);
    ca.proceed().subscribe(rez => {
        logger.info({ result: rez }, "got result");
    }, err => {
        logger.error(err);
    }, () => {
        logger.info("all done");
    });
});

// console.log("hi");

interface Result {

}

class ContinueError implements Error {
    name: string = "ContinueError";
    message: string = "";
}

// 后置处理器，比如判断结果然后终止act队列
interface PostProcessor {
    invoke(ctx?: any): any;
}

class ContinuePostProcessor implements PostProcessor {
    condition: string = "";

    parse(data: any): void {
        let cond = data['@_condition'] || "(true)";
        cond = `({
            run: (ctx: any) => {
                return (${cond});
            }
        })`;
        this.condition = ts.transpile(cond);
    }

    invoke(ctx?: any): any {
        let t = eval(this.condition);
        if (t.run(ctx)) {
            throw new ContinueError();
        }
    }
}

class SimpleResult implements Result {

}

interface Activity {
    parse(data: any): void;
    // 每个act执行结果不一定是一个结果，因为有类似loop这种act存在。
    proceed(): Observable<Result>;
}

class SleepActivity implements Activity {
    sleepMilliseconds: number = 0;

    parse(data: any): void {
        let sec = parseInt(data['@_seconds']);
        this.sleepMilliseconds = sec * 1000;
    }

    proceed(): Observable<Result> {
        // logger.info(`sleep ${this.sleepMilliseconds} ms`);
        return timer(this.sleepMilliseconds).pipe(
            ignoreElements(),
            tap(undefined, undefined, () => {
                logger.info(`sleep ${this.sleepMilliseconds}ms DONE`);
            }),
        );
    }
}

class CompositeActivity implements Activity {
    activities: Array<Activity> = [];

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

        logger.info({ actions: this.activities }, "parse done")
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
        )
    }
}

class LoopActivity extends CompositeActivity {
    loopCount: number = -1;

    parse(data: any): void {
        this.loopCount = Number(data['@_count']) || -1;
        super.parse(data);
    }

    proceed(): Observable<Result> {
        return from(this.activities).pipe(
            repeat(this.loopCount),
            map(act => act.proceed()),
            concatAll(),
            // 如果error是Continue，那么不应当简单当作error，而是重头执行
            catchError((err, caught) => {
                if (err instanceof ContinueError) {
                    return caught;
                }

                throw err;
            }),
        );
    }
}

var tt = {
    cnt: 0,
};

class EchoActivity implements Activity {
    message: string = "";
    postprocessor?: PostProcessor;

    parse(data: any): void {
        this.message = data['@_message'];

        // 解析postprocessor
        if (data.postprocessor) {
            let ppnode =data.postprocessor;
            let pp = null;
            if (ppnode['@_type'] == 'continue') {
                pp = new ContinuePostProcessor();
            }

            if (pp) {
                pp.parse(ppnode);
                this.postprocessor = pp;
            }
        }
    }

    proceed(): Observable<Result> {
        return of(this).pipe(
            tap(t => {
                logger.info(t.message);
            }),
            map(t => {
                if (!t.postprocessor) {
                    return t;
                }

                return t.postprocessor.invoke(tt);
            }),
            ignoreElements(),
        );
    }
}


// class DemoActionActivity implements ActionActivity {
//     parse(data: any): void {
//         logger.info({data: data}, "parsing demo action");
//     }

//     proceed(): Observable<Result> {
//         logger.info("request proceeding demo action");
//         return of(new SimpleResult()).pipe(
//             tap(x => {
//                 logger.info({result: x}, "proceed demo action DONE")
//             }),
//         );
//     }
// }