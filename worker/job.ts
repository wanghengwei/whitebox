import { Robot } from "./robot";
import { Observable, Subject, bindNodeCallback, concat } from "rxjs";
import { TestCase } from "./testcase";
import { JobDef } from "./job_def";
import testCaseManager from './testcase_manager';
import { flatMap, ignoreElements, single } from "rxjs/operators";
import broker, {proto} from './broker';
import logger from "./logger";

// 一个Job表示用例+robot，包含运行时数据。
export class Job {
    robot: Robot;
    // 保存用例的id，可能log时有用。
    testCaseRef: string;
    // 具体的用例。由于可能从网络获取，因此是一个observable
    testCase: Observable<TestCase>;
    stopNotifier: Subject<boolean>;

    constructor(def: JobDef) {
        this.robot = new Robot(def.account, def.playerData);
        // this.robot.setProperties(def.playerData);
        this.testCaseRef = def.testCaseRef;
        this.testCase = testCaseManager.findTestCase(def.testCaseRef);
        this.stopNotifier = new Subject();
    }

    public stop() {
        this.stopNotifier.complete();
    }

    public run() {
        logger.info("prepared to run job");
        // setup 成功后，
        // 等testcase到位了才开始执行
        // 如果setup 失败了，testcase也没必要等了，直接作为错误
        return concat(this.setupRobot(), this.testCase).pipe(
            // 必须唯一
            single(),
            flatMap(tc => { 
                logger.info({robot: this.robot, testcase: this.testCaseRef}, "runJob");
                return tc.run(this.robot, this.stopNotifier);
            }),
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
        logger.info({account: this.robot.account}, `teardownRobot`);
        broker.RobotTeardown({account: this.robot.account}, (err, res) => {
            logger.info({grpc_error: err, result: res}, "teardownRobot DONE");
        });
    }
}
