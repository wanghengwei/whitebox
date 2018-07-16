/* js

while (running) {
    let order = waitOrder();
    let tc = findTestCase(order.testCaseId);
    let robot = createRobot(order.account, order.params);
    let job = new Job(tc, robot);
    jobManager.add(job);

    tc.run(robot, job.stop).subscribe(state => {
        log(state);
    }, err => {
        job.markAsFailed();
    });
}

class Job {

}

class TestCase {
    function run(robot, stopSignal) {
        actions.take_until(stopSignal).flat_map(a => {
            return a.run(robot);
        })
    }
}

class SendAction {
    function run(robot) {
        let fn = findFunc(broker, `send${this.eventName}`);
        return just(fn(this.params));
    }
}

class RecvAction {
    function run(robot) {
        let fn = ...;
        return fn(this.params) as observable;
    }
}

*/

/* c++
class Broker {
    Result Connect(param) {
        auto srv = serverManager.getServer(serverName);
        srv.connect(params);
        onConnect(conn, err => connectionManager.addConnection(serverName, acc, conn));'
        return connIdx;
    }

    Result RecvCEventInitConnRes(acc, srvName, idx) {
        auto conn = connectionManager.findConnection(acc, srvName, idx);
        conn.addWaitingEvent(eventId);
        // async return
    }
}
*/

const rxjs = require('rxjs');
const opts = require('rxjs/operators');
const fs = require('fs');
const xmlparser = require('fast-xml-parser');
const grpc = require('grpc');

var x51 = grpc.load(`${__dirname}/../protos/x51.proto`).x51;
var broker = new x51.Broker('localhost:12345', grpc.credentials.createInsecure());
// var recvBroker = new x51.RecvBroker('localhost:12345', grpc.credentials.createInsecure());

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

class SendEventAction {
    constructor(eventName) {
        this.eventName = eventName;
    }

    run(robot, stopNotifier) {
        // send event ...
        let f = (arg, cb) => broker[`Send${this.eventName}`](arg, cb);
        return rxjs.bindCallback(f)({
            account: "1212",
            service: "User",
            connectionIndex: 0,
        });
    }
}

class RecvEventAction {
    constructor(eventName) {
        this.eventName = eventName;
    }

    run(robot, stopNotifier) {
        let f = (arg, cb) => broker[`Recv${this.eventName}`](arg, cb);
        return rxjs.bindCallback(f)({
            account: "1212",
            service: "User",
            connectionIndex: 0,
        })
    }
}

class TestCase {
    constructor(def) {
        this.actions = [];
        // this.actions = [new SendEventAction("CEventLogin")];
        def.test_case.template.action.forEach(x => {
            let t = x["@_type"];
            if (t == "send") {
                this.actions.push(new SendEventAction(x["@_name"]));
            } else if (t == "recv") {
                this.actions.push(new RecvEventAction(x["@_name"]));
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
        let job =new Job(jd);
        jobManager.addJob(job);
        job.run().subscribe(state => {
            console.log(state);
        });
    });
}

// getJobDefs().subscribe(console.log);
main();
// console.log(broker['SendCEventLogin']);