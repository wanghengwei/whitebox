import { Observable, Subject } from "rxjs";
import { JobDef } from "./job_def";
import { Robot } from "./robot";
import { TestCase } from './testcase';
import testCaseManager from './testcase_manager';
import { flatMap, single } from "rxjs/operators";
import logger from "./logger";
import { Job } from "./job";

interface JobManager {
    addJob(job: Job);
}


class JobManagerImpl implements JobManager {
    jobs: Array<Job> = [];

    addJob(job: Job) {
        this.jobs.push(job);
    }
}

export default new JobManagerImpl();