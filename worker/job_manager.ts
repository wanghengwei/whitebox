import { Observable, Subject } from "rxjs";
import { JobDef } from "./job_def";
import { Robot } from "./robot";
import { TestCase } from './testcase';
import testCaseManager from './testcase_manager';
import { flatMap } from "rxjs/operators";

class Job {
    robot: Robot;
    testCase: Observable<TestCase>;
    stopNotifier: Subject<any>;

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
        return this.testCase.pipe(
            flatMap(tc => tc.run(this.robot, this.stopNotifier)),
        );
    }
}

interface JobManager {
    addJob(job: Job);
}