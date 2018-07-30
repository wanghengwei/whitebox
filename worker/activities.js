"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc_1 = __importDefault(require("grpc"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const errors_1 = require("./errors");
const logger_1 = __importDefault(require("./logger"));
const postprocessors_1 = require("./postprocessors");
const x51 = grpc_1.default.load(`${__dirname}/../protos/x51.proto`);
const broker = new x51.Broker('localhost:12345', grpc_1.default.credentials.createInsecure());
// 动作的返回值。
// 有些动作没有返回，比如sleep
// 对于send这些动作，返回值是一个枚举
// 业务act如果失败了，是作为一个item，到js这边处理。换句话说，Result必须要能反映是否失败，如果失败，必须有失败信息；如果成功，需要有数据。
class Result {
    constructor(err) {
        if (!err || err.ok) {
            this.error = null;
        }
        else {
            this.error = err;
        }
    }
    ok() {
        return this.error == null;
    }
}
// 表示简单act，只返回最多一个结果的。和loop那种不一样。
// 子类应该实现doParse & doProceed
class SimpleActivity {
    constructor() {
        this.delayTime = 0;
    }
    parse(data) {
        this.parsePostprocessor(data.postprocessor);
        this.doParse(data);
    }
    proceed(ctx) {
        return this.doProceed(ctx).pipe(
        // 后置处理
        // 要求所有act都要返回点东西，不能是empty
        operators_1.map((x, idx) => {
            if (!this.postprocessor) {
                return x;
            }
            return this.postprocessor.invoke(x, idx);
        }), 
        // 延迟执行
        operators_1.delay(this.delayTime), operators_1.filter(x => x instanceof Result));
    }
    parsePostprocessor(data) {
        // 解析postprocessor
        if (data) {
            let pp = null;
            if (data["@_type"] == "continue") {
                pp = new postprocessors_1.ContinuePostProcessor();
            }
            if (pp) {
                pp.parse(data);
                this.postprocessor = pp;
            }
        }
    }
}
class CompositeActivity {
    constructor() {
        this.activities = [];
        this.tag = "";
    }
    parse(data) {
        let actions = data.action;
        if (!Array.isArray(actions)) {
            if (actions == undefined) {
                actions = [];
            }
            else {
                actions = [actions];
            }
        }
        actions.forEach((x) => {
            let t = x["@_type"];
            let act = null;
            if (t == "sleep") {
                act = new SleepActivity();
            }
            else if (t == "loop") {
                act = new LoopActivity();
            }
            else if (t == "echo") {
                act = new EchoActivity();
            }
            else if (t == "select") {
                act = new SelectActivity();
            }
            else if (t == 'connect') {
                act = new ConnectActionActivity();
            }
            else if (t == 'send') {
                act = new SendActionActivity();
            }
            if (act == null) {
                return;
            }
            act.parse(x);
            this.activities.push(act);
        });
        // logger.info({ actions: this.activities }, "parse done")
    }
    proceed(ctx) {
        // 如果某个act的postprocessor是continue且条件满足，那么就应当终止队列，然后：
        // 根据tag找到要重新执行的loop或composite
        // 只有能产生一个结果的act才能有这种postprocessor。sleep、echo、loop这些都不行。
        // 除了takeWhile，还可以：让act在生成Result时产生错误来终止队列。
        return rxjs_1.from(this.activities).pipe(
        // --act--act--act-->
        operators_1.map(act => {
            return act.proceed(ctx);
        }), 
        // --[rez]--[rez]--[rez]-->
        operators_1.concatAll(), 
        // --rez--rez--rez-->
        // 如果某个rez的postprocessor满足某种条件，那么就应当终止队列
        // 如果error是Continue，那么不应当简单当作error，而是重头执行
        operators_1.catchError((err, caught) => {
            if (err instanceof errors_1.ContinueError && err.tag == this.tag) {
                return caught;
            }
            throw err;
        }));
    }
}
exports.CompositeActivity = CompositeActivity;
class SleepActivity extends SimpleActivity {
    doParse(data) {
        let sec = Number(data["@_seconds"]) || 0;
        this.delayTime = sec * 1000;
    }
    doProceed(ctx) {
        return rxjs_1.of(true);
    }
}
class LoopActivity extends CompositeActivity {
    constructor() {
        super(...arguments);
        this.loopCount = -1;
    }
    // tag: string = "";
    parse(data) {
        this.loopCount = Number(data["@_count"]) || -1;
        this.tag = data["@_tag"];
        super.parse(data);
    }
    proceed(ctx) {
        return super.proceed(ctx).pipe(operators_1.repeat(this.loopCount));
    }
}
class EchoActivity extends SimpleActivity {
    constructor() {
        super(...arguments);
        this.message = "";
    }
    // postprocessor?: PostProcessor;
    doParse(data) {
        this.message = data["@_message"];
        this.delayTime = 1000;
    }
    doProceed(ctx) {
        return rxjs_1.of(this.message).pipe(operators_1.tap(t => {
            logger_1.default.info(t);
        }));
    }
}
// 表示一个多选一的分支图。使用场景：同时等待多个event从服务器返回，只取第一个返回的值。
class SelectActivity extends SimpleActivity {
    constructor() {
        super(...arguments);
        this.forks = [];
    }
    doParse(data) {
        if (!data.fork || !Array.isArray(data.fork)) {
            logger_1.default.warn("invalid synchronization activity");
        }
        data.fork.forEach((x) => {
            let ca = new CompositeActivity();
            ca.parse(x);
            this.forks.push(ca);
        });
    }
    doProceed(ctx) {
        logger_1.default.info({ forks: this.forks }, "select");
        let rs = this.forks.map(act => act.proceed(ctx));
        return rxjs_1.race(rs).pipe(operators_1.takeLast(1));
    }
}
// 表示一个连接服务器的动作
class ConnectActionActivity extends SimpleActivity {
    constructor() {
        super(...arguments);
        this.service = "";
        this.connectionIndex = 0;
        this.addressKey = "";
        this.portKey = "";
    }
    doParse(data) {
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
        this.addressKey = data['@_address'] || `${this.service}.${this.connectionIndex}.Address`;
        this.portKey = data['@_port'] || `${this.service}.${this.connectionIndex}.Port`;
        logger_1.default.info("ConnectActionActivity parsed");
    }
    doProceed(ctx) {
        let robot = ctx.robot;
        let f = (args, cb) => broker.Connect(args, cb);
        return rxjs_1.bindNodeCallback(f)({
            connectionId: {
                service: this.service,
                account: robot.account,
                connectionIndex: this.connectionIndex,
            },
            address: robot.getProp(this.addressKey),
            port: robot.getProp(this.portKey),
            password: "",
        }).pipe(operators_1.map((x) => new Result(x.error)));
    }
}
class SendActionActivity extends SimpleActivity {
    constructor() {
        super(...arguments);
        this.event = "";
        this.service = "";
        this.connectionIndex = 0;
    }
    doProceed(ctx) {
        let f = (arg, cb) => broker[`Send${this.event}`](arg, cb);
        return rxjs_1.bindNodeCallback(f)({
            account: ctx.robot.account,
            service: this.service,
            connectionIndex: this.connectionIndex,
        }).pipe(operators_1.map((x) => new Result(x.error)));
    }
    doParse(data) {
        this.event = data['@_name'];
        this.service = data['@_service'];
        this.connectionIndex = Number(data['@_conn']) || 0;
    }
}
