import { Robot } from "./robot";
import { Observable, Subject, bindNodeCallback, concat } from "rxjs";
import { TestCase } from "./testcase";
import { JobDef } from "./job_def";
import testCaseManager from './testcase_manager';
import { flatMap, ignoreElements } from "rxjs/operators";
import broker from './broker';
import logger from "./logger";

export class Job {
    robot: Robot;
    testCase: Observable<TestCase>;
    stopNotifier: Subject<boolean>;

    constructor(def: JobDef) {
        this.robot = new Robot(def.account, def.playerData);
        // this.robot.setProperties(def.playerData);
        this.testCase = testCaseManager.findTestCase(def.testCaseRef);
        this.stopNotifier = new Subject();
    }

    stop() {
        this.stopNotifier.complete();
    }

    run() {
        logger.info({robot: this.robot}, "start running job");

        // setup 成功后，
        // 等testcase到位了才开始执行
        // 如果setup 失败了，testcase也没必要等了，直接作为错误
        return concat(this.setupRobot(), this.testCase).pipe(
            flatMap(tc => tc.run(this.robot, this.stopNotifier)),
        );
    }

    // 初始化robot
    setupRobot(): Observable<any> {
        let f = (args, cb) => {
            try {
                logger.info({args}, "setupRobot");

                let cb2 = (err, res) => {
                    logger.info({rpc_error: err, result: res}, "setupRobot DONE");
                    cb(err, res);
                };
                args.playerData = new Map(Object.entries(args.playerData));
                broker.RobotSetup(args, cb2);
            } catch (e) {
                logger.error({exception: e}, "setupRobot FAILED");
                throw e;
            }
        };
        let args = {
            account: this.robot.account,
            playerData: this.robot.playerData,
        };
        return bindNodeCallback(f)(args).pipe(ignoreElements());
    }

    teardownRobot() {
        broker.RobotTeardown({account: this.robot.account}, (err, res) => {});
    }
}
