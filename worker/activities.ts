import grpc from 'grpc';
import { bindNodeCallback, from, Observable, of, race, concat, timer } from "rxjs";
import { catchError, concatAll, delay, filter, map, repeat, takeLast, tap, ignoreElements } from "rxjs/operators";
import { ContinueError, RestartError, RetryError } from "./errors";
import logger from "./logger";
import { ContinuePostProcessor, PostProcessor } from "./postprocessors";
import { Robot } from './robot';

const x51 = grpc.load(`${__dirname}/../protos/x51.proto`);
const broker = new x51.Broker('localhost:12345', grpc.credentials.createInsecure());

// 动作的返回值。
// 有些动作没有返回，比如sleep
// 对于send这些动作，返回值是一个枚举
// 业务act如果失败了，是作为一个item，到js这边处理。换句话说，Result必须要能反映是否失败，如果失败，必须有失败信息；如果成功，需要有数据。
class Result {
  // 动作基本信息
  metadata: any;
  // 错误信息。null表示没有错误
  error: any;

  constructor(metadata: any, err?: any) {
    this.metadata = metadata;

    if (!err || err.ok) {
      this.error = null;
    } else {
      this.error = err;
    }
  }

  ok(): boolean {
    return this.error == null;
  }
}

interface Activity {
  parse(data: any): void;

  // 每个act执行结果不一定是一个结果，因为有类似loop这种act存在。
  proceed(ctx: any): Observable<Result>;
}

// 表示简单act，只返回最多一个结果的。和loop那种不一样。
// 子类应该实现doParse & doProceed
abstract class SimpleActivity implements Activity {
  postprocessor?: PostProcessor;
  // 默认动作与动作之间间隔1秒。最好是可配
  delayTime: number = 1000;
  // 错误处理策略。这个会在postprocessor之前处理。默认是ignore。如果要修改默认值，子类应当在构造函数里赋值。
  // 最终这个值都会被xml的on_error属性覆盖
  onErrorHandler: string = "ignore";

  parse(data: any): void {
    this.parsePostprocessor(data.postprocessor);
    this.onErrorHandler = data['@_on_error'] || this.onErrorHandler;
    this.doParse(data);
  }

  proceed(ctx: any): Observable<Result> {
    return this.doProceed(ctx).pipe(
      // 执行on_error的handler
      map(r => {
        // logger.info(`on_error is ${this.onErrorHandler}`);
        if (r == undefined || !r.error) {
          // 没有错误
          return r;
        }

        if (this.onErrorHandler == 'restart') {
          // 如果 on_error="restart" ，那么应当重新执行整个用例。
          // 做法就是抛出个错误，让最顶层去catchError
          // 不过这里有个问题，丢失了一次运行结果
          throw new RestartError(r);
        } else if (this.onErrorHandler == 'retry') {
          // 重试当前动作
          throw new RetryError(r);
        } else {
          // 其他情况就当作ignore
          return r;
        }
      }),
      catchError((err, caught) => {
        if (err instanceof RetryError) {
          // 重新执行当前动作
          // 不过要把之前的结果也附带上，因为统计时要计算
          return concat(of(err.lastResult), timer(2000).pipe(ignoreElements()), this.proceed(ctx));
        }
        
        throw err;
      }),
      // 执行后置处理器
      // 要求所有act都要返回点东西，不能是empty
      map((x, idx) => {
        if (!this.postprocessor) {
          return x;
        }

        return this.postprocessor.invoke(x, idx);
      }),
      // 延迟执行
      delay(this.delayTime),
      // 最终只返回Result类型的对象
      filter(x => x instanceof Result)
    );
  }

  abstract doProceed(ctx: any): Observable<any>;

  abstract doParse(data: any): void;

  parsePostprocessor(data: any): void {
    // 解析postprocessor
    if (data) {
      let pp = null;
      if (data["@_type"] == "continue") {
        pp = new ContinuePostProcessor();
      }

      if (pp) {
        pp.parse(data);
        this.postprocessor = pp;
      }
    }
  }
}

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
      }

      if (act == null) {
        return;
      }

      act.parse(x);
      this.activities.push(act);
    });

    // logger.info({ actions: this.activities }, "parse done")
  }

  proceed(ctx: any): Observable<Result> {
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
      })
    );
  }
}

class SleepActivity extends SimpleActivity {
  doParse(data: any): void {
    let sec = Number(data["@_seconds"]) || 0;
    this.delayTime = sec * 1000;
  }

  doProceed(ctx: any): Observable<any> {
    return of(true);
  }
}

class LoopActivity extends CompositeActivity {
  loopCount: number = -1;
  // tag: string = "";

  parse(data: any): void {
    this.loopCount = Number(data["@_count"]) || -1;
    this.tag = data["@_tag"];
    super.parse(data);
  }

  proceed(ctx: any): Observable<any> {
    return super.proceed(ctx).pipe(repeat(this.loopCount));
  }
}

class EchoActivity extends SimpleActivity {
  message: string = "";
  // postprocessor?: PostProcessor;

  doParse(data: any): void {
    this.message = data["@_message"];
    this.delayTime = 1000;
  }

  doProceed(ctx: any): Observable<any> {
    return of(this.message).pipe(
      tap(t => {
        logger.info(t);
      })
    );
  }
}

// 表示一个多选一的分支图。使用场景：同时等待多个event从服务器返回，只取第一个返回的值。
class SelectActivity extends SimpleActivity {
  forks: Array<CompositeActivity> = [];

  doParse(data: any) {
    if (!data.fork || !Array.isArray(data.fork)) {
      logger.warn("invalid synchronization activity");
    }

    data.fork.forEach((x: any) => {
      let ca = new CompositeActivity();
      ca.parse(x);
      this.forks.push(ca);
    });
  }

  doProceed(ctx: any): Observable<any> {
    logger.info({ forks: this.forks }, "select");

    let rs = this.forks.map(act => act.proceed(ctx));
    return race(rs).pipe(takeLast(1));
  }
}

// 表示一个连接服务器的动作
class ConnectActionActivity extends SimpleActivity {
  service: string = "";
  connectionIndex: number = 0;
  addressKey: string = "";
  portKey: string = "";

  constructor() {
    super();
    this.onErrorHandler = "restart";
  }

  doParse(data: any) {
    this.service = data['@_service'];
    this.connectionIndex = Number(data['@_conn']) || 0;
    this.addressKey = data['@_address'] || `${this.service}.${this.connectionIndex}.Address`;
    this.portKey = data['@_port'] || `${this.service}.${this.connectionIndex}.Port`;

    logger.info("ConnectActionActivity parsed");
  }

  doProceed(ctx: any): Observable<any> {
    let robot: Robot = ctx.robot;

    let f = (args: any, cb: any) => broker.Connect(args, cb);

    let args = {
      connectionId: {
        service: this.service,
        account: robot.account,
        index: this.connectionIndex,
      },
      address: robot.getProp(this.addressKey),
      port: robot.getProp(this.portKey),
      password: "",
    };

    return bindNodeCallback(f)(args).pipe(
      // 返回的是broker返回的result。如果grpc的错误，不会走这里，直接作为队列错误了。
      map((x: any) => {
        // logger.info({result: x}, `Connect DONE`);
        return new Result({
          type: "connect",
          args,
        }, x.error);
      }),
    );
  }
}

class SendActionActivity extends SimpleActivity {
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
      map((x: any) => new Result({
        type: "send",
        event: this.event,
        args,
      }, x.error)),
    );
  }

  doParse(data: any): void {
    this.event = data['@_name'];
    this.service = data['@_service'];
    this.connectionIndex = Number(data['@_conn']) || 0;
  }
}

class RecvActionActivity extends SimpleActivity {
  event: string = "";
  service: string = "";
  connectionIndex: number = 0;

  doProceed(ctx: any): Observable<any> {
    let f = (arg, cb) => broker[`Recv${this.event}`](arg, cb);
    let args = {
      account: ctx.robot.account,
      service: this.service,
      index: this.connectionIndex,
    };
    return bindNodeCallback(f)(args).pipe(
      map((x: any) => new Result({
        type: "recv",
        event: this.event,
        args,
      }, x.error)),
    );
  }

  doParse(data: any): void {
    this.event = data['@_name'];
    this.service = data['@_service'];
    this.connectionIndex = Number(data['@_conn']) || 0;
  }
}