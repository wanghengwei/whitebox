"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("grpc"));
const pino_1 = __importDefault(require("pino"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs_1 = require("fs");
const fast_xml_parser_1 = require("fast-xml-parser");
const activities_1 = require("./activities");
const robot_1 = require("./robot");
const logger = pino_1.default({ prettyPrint: true });
var x51 = grpc.load(`${__dirname}/../protos/x51.proto`);
var broker = new x51.Broker('localhost:12345', grpc.credentials.createInsecure());
// get job definitions from network or local file or command line
function getJobDefs() {
    return rxjs_1.of({
        account: "1000",
        testCase: "demo",
        params: {
            "User.0.Address": "172.17.100.23",
            "User.0.Port": 33301,
        }
    });
}
// // 发起连接，并等待连接失败或成功
// class ConnectAction {
//     constructor(addr, port, srv, idx) {
//         this.address = addr;
//         this.port = port;
//         this.service = srv;
//         this.connIdx = idx;
//     }
//     run(robot, stopNotifier) {
//         let f = (arg, cb) => broker.Connect(arg, cb);
//         return rxjs.bindCallback(f)({
//             address: this.address,
//             port: this.port,
//             password: robot.password,
//             connectionId: {
//                 service: this.service,
//                 account: robot.account,
//                 connectionIndex: this.connIdx,
//             },
//         });
//     }
// }
// class SendEventAction {
//     constructor(eventName, srv, connIdx) {
//         this.eventName = eventName;
//         this.serviceName = srv;
//         this.connectionIndex = connIdx;
//     }
//     run(robot, stopNotifier) {
//         let f = (arg, cb) => broker[`Send${this.eventName}`](arg, cb);
//         return rxjs.bindCallback(f)({
//             account: robot.account,
//             service: this.serviceName,
//             connectionIndex: parseInt(this.connectionIndex),
//         });
//     }
// }
// class RecvEventAction {
//     constructor(eventName, srv, connIdx) {
//         this.eventName = eventName;
//         this.serviceName = srv;
//         this.connectionIndex = connIdx;
//     }
//     run(robot, stopNotifier) {
//         let f = (arg, cb) => broker[`Recv${this.eventName}`](arg, cb);
//         return rxjs.bindCallback(f)({
//             account: robot.account,
//             service: this.serviceName,
//             connectionIndex: parseInt(this.connectionIndex),
//         })
//     }
// }
// class SleepAction {
//     constructor(sec) {
//         this.sleepDuration = sec * 1000;
//     }
//     run(robot, stopNotifier) {
//         return rxjs.timer(this.sleepDuration).pipe(
//             opts.map(_ => {
//                 // logger.info({x51: x51}, 'map');
//                 return new x51.Result(true);
//             })
//         );
//     }
// }
class TestCase {
    constructor(def) {
        this.act = new activities_1.CompositeActivity();
        this.act.parse(def.test_case.template);
        // // 解析每个动作
        // this.actions = [];
        // let templates = [];
        // if (Array.isArray(def.test_case.template.action)) {
        //     templates = def.test_case.template.action;
        // } else {
        //     templates.push(def.test_case.template.action);
        // }
        // templates.forEach(x => {
        //     let t = x["@_type"];
        //     let srv = x['@_service'];
        //     let connIdx = parseInt(x['@_conn']);
        //     if (t == "send") {
        //         this.actions.push(new SendEventAction(x["@_name"], srv, connIdx));
        //     } else if (t == "recv") {
        //         this.actions.push(new RecvEventAction(x["@_name"], srv, connIdx));
        //     } else if (t == "connect") {
        //         // console.log(`add connect action: service=${srv}`);
        //         this.actions.push(new ConnectAction("", 0, srv, connIdx));
        //     } else if (t == "sleep") {
        //         let sec = parseInt(x['@_seconds']);
        //         logger.info({ seconds: sec }, "add a sleep action");
        //         this.actions.push(new SleepAction(sec));
        //     }
        // }, this);
    }
    run(robot, stopNotifier) {
        return this.act.proceed({ robot });
        // return rxjs.from(this.actions).pipe(
        //     opts.takeUntil(stopNotifier),
        //     opts.flatMap(act => {
        //         return act.run(robot, stopNotifier);
        //     }),
        // );
    }
}
class TestCaseManager {
    findTestCase(id) {
        let f = rxjs_1.bindNodeCallback(fs_1.readFile);
        return f(`${__dirname}/../${id}.xml`).pipe(operators_1.map(data => {
            let x = fast_xml_parser_1.parse(data.toString(), { ignoreAttributes: false });
            return new TestCase(x);
        }));
    }
}
var testCaseManager = new TestCaseManager();
class Job {
    constructor(def) {
        this.robot = new robot_1.Robot(def.account);
        this.robot.setProperties(def.params);
        this.testCase = testCaseManager.findTestCase(def.testCase);
        this.stopNotifier = new rxjs_1.Subject();
    }
    stop() {
        this.stopNotifier.complete();
    }
    run() {
        return this.testCase.pipe(operators_1.flatMap(tc => tc.run(this.robot, this.stopNotifier)));
    }
}
class JobManager {
    constructor() {
        this.jobs = [];
    }
    addJob(job) {
        this.jobs.push(job);
    }
}
var jobManager = new JobManager();
function main() {
    getJobDefs().subscribe(jd => {
        logger.info({ job: jd }, `received a job`);
        let job = new Job(jd);
        jobManager.addJob(job);
        job.run().subscribe(state => {
            logger.info({ result: state }, "job done");
        }, err => {
            logger.error({ error: err }, "job error");
        }, () => {
            logger.info("all done");
        });
    });
}
main();
