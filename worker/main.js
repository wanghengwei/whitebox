'use strict';

const rxjs = require('rxjs');
const opts = require('rxjs/operators');
const fs = require('fs');
const xmlparser = require('fast-xml-parser');
const grpc = require('grpc');
const logger = require('pino')({prettyPrint: true});

var x51 = grpc.load(`${__dirname}/../protos/x51.proto`);
var broker = new x51.Broker('localhost:12345', grpc.credentials.createInsecure());

// get job definitions from network or local file or command line
function getJobDefs() {
    return rxjs.of({
        account: "1000",
        testCase: "demo",
        params: {
            "UserServer.IP": "1.2.3.4",
            "UserServer.Port": "33301",
        }
    });
}

class Robot {
    constructor(acc) {
        this.account = acc;
    }
}

// 发起连接，并等待连接失败或成功
class ConnectAction {
    constructor(addr, port, srv, idx) {
        this.address = addr;
        this.port = port;
        this.service = srv;
        this.connIdx = idx;
    }

    run(robot, stopNotifier) {
        let f = (arg, cb) => broker.Connect(arg, cb);
        return rxjs.bindCallback(f)({
            address: this.address,
            port: this.port,
            password: robot.password,
            connectionId: {
                service: this.service,
                account: robot.account,
                connectionIndex: this.connIdx,
            },
        });
    }
}

class SendEventAction {
    constructor(eventName, srv, connIdx) {
        this.eventName = eventName;
        this.serviceName = srv;
        this.connectionIndex = connIdx;
    }

    run(robot, stopNotifier) {
        let f = (arg, cb) => broker[`Send${this.eventName}`](arg, cb);
        return rxjs.bindCallback(f)({
            account: robot.account,
            service: this.serviceName,
            connectionIndex: parseInt(this.connectionIndex),
        });
    }
}

class RecvEventAction {
    constructor(eventName, srv, connIdx) {
        this.eventName = eventName;
        this.serviceName = srv;
        this.connectionIndex = connIdx;
    }

    run(robot, stopNotifier) {
        let f = (arg, cb) => broker[`Recv${this.eventName}`](arg, cb);
        return rxjs.bindCallback(f)({
            account: robot.account,
            service: this.serviceName,
            connectionIndex: parseInt(this.connectionIndex),
        })
    }
}

class SleepAction {
    constructor(sec) {
        this.sleepDuration = sec * 1000;
    }

    run(robot, stopNotifier) {
        return rxjs.timer(this.sleepDuration).pipe( 
            opts.map(_ => {
                // logger.info({x51: x51}, 'map');
                return new x51.Result(true);
            })
        );
    }
}

class TestCase {
    constructor(def) {
        // 解析每个动作
        this.actions = [];
        let templates = [];
        if (Array.isArray(def.test_case.template.action)) {
            templates = def.test_case.template.action;
        } else {
            templates.push(def.test_case.template.action);
        }

        templates.forEach(x => {
            let t = x["@_type"];
            let srv = x['@_service'];
            let connIdx = parseInt(x['@_conn']);

            if (t == "send") {
                this.actions.push(new SendEventAction(x["@_name"], srv, connIdx));
            } else if (t == "recv") {
                this.actions.push(new RecvEventAction(x["@_name"], srv, connIdx));
            } else if (t == "connect") {
                // console.log(`add connect action: service=${srv}`);
                this.actions.push(new ConnectAction("", 0, srv, connIdx));
            } else if (t == "sleep") {
                let sec = parseInt(x['@_seconds']);
                logger.info({seconds: sec}, "add a sleep action");

                this.actions.push(new SleepAction(sec));
            }
        }, this);
    }

    run(robot, stopNotifier) {
        return rxjs.from(this.actions).pipe(
            opts.takeUntil(stopNotifier),
            opts.flatMap(act => {
                return act.run(robot, stopNotifier);
            }),
        );
    }
}

class TestCaseManager {
    constructor() {
        // this.tc = new TestCase();
    }

    findTestCase(id) {
        let f = rxjs.bindNodeCallback(fs.readFile);
        return f(`${__dirname}/../${id}.xml`, 'utf-8').pipe(
            opts.map(data => {
                let x = xmlparser.parse(data, {ignoreAttributes: false});
                return new TestCase(x);
            }),
        );
    }
}
var testCaseManager = new TestCaseManager();

class Job {
    constructor(def) {
        this.robot = new Robot(def.account);
        this.testCase = testCaseManager.findTestCase(def.testCase);
        this.stopNotifier = new rxjs.Subject();
    }

    stop() {
        this.stopNotifier.complete();
    }

    run() {
        return this.testCase.pipe(
            opts.flatMap(tc => tc.run(this.robot, this.stopNotifier)),
        );
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
        logger.info({job: jd}, `received a job`);

        let job =new Job(jd);
        jobManager.addJob(job);
        job.run().subscribe(state => {
            logger.info({result: state}, "job done");
        }, err => {
            logger.error({error: err}, "job error");
        }, () => {
            logger.info("all done");
        });
    });
}

main();
