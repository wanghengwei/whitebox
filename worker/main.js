"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const job_receiver_1 = __importDefault(require("./job_receiver"));
const robot_1 = require("./robot");
const testcase_manager_1 = __importDefault(require("./testcase_manager"));
const logger = pino_1.default({ prettyPrint: true });
// var x51 = grpc.load(`${__dirname}/../protos/x51.proto`);
// var broker = new x51.Broker('localhost:12345', grpc.credentials.createInsecure());
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
class Job {
    constructor(def) {
        this.robot = new robot_1.Robot(def.account);
        this.robot.setProperties(def.playerProperties);
        this.testCase = testcase_manager_1.default.findTestCase(def.testCaseRef);
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
    job_receiver_1.default.getJobs().subscribe(jd => {
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
