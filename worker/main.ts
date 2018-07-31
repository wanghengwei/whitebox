import pino from 'pino';
import { Observable, Subject } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { JobDef } from './job_def';
import jobReceiver from './job_receiver';
import { Robot } from './robot';
import { TestCase } from './testcase';
import testCaseManager from './testcase_manager';

const logger = pino({ prettyPrint: true });

class Job {
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
        return this.testCase.pipe(
            flatMap(tc => tc.run(this.robot, this.stopNotifier)),
        );
    }
}

class JobManager {
    jobs: Array<Job> = [];

    addJob(job: Job) {
        this.jobs.push(job);
    }
}

var jobManager = new JobManager();

function main() {
    jobReceiver.getJobs().subscribe(jd => {
        logger.info({ job: jd }, `received a job`);

        let job = new Job(jd);
        jobManager.addJob(job);
        job.run().subscribe(state => {
            logger.info({ result: state }, "action done");
        }, err => {
            logger.error({ error: err }, "job error");
        }, () => {
            logger.info("all done");
        });
    });
}

main();
