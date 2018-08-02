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
        this.robot = new Robot(def.account);
        this.robot.setProperties(def.playerProperties);
        this.testCase = testCaseManager.findTestCase(def.testCaseRef);
        this.stopNotifier = new Subject();
    }

    stop() {
        this.stopNotifier.complete();
    }

    run() {
        logger.info({robot: this.robot}, "start running job");

        // 首先初始化机器人的一些自定义数据
        let setup = (args, cb) => {
            try {
                logger.info("setup robot");
                broker.RobotSetup(args, cb);
            } catch (e) {
                logger.error({exception: e}, "setup robot failed");
                throw e;
            }
        };
        let args = {
            account: this.robot.account,
            properties: this.robot.properties,
        };
        let setupResult = bindNodeCallback(setup)(args).pipe(ignoreElements());

        // setup 成功后，
        // 等testcase到位了才开始执行
        // 如果setup 失败了，testcase也没必要等了，直接作为错误
        return concat(setupResult, this.testCase).pipe(
            flatMap(tc => tc.run(this.robot, this.stopNotifier)),
        );
    }
}
