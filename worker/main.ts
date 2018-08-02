import pino from 'pino';
import broker from './broker';
import { Job } from './job';
import jobReceiver from './job_receiver';

const logger = pino({ prettyPrint: true });

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

        // 创建job
        let job = new Job(jd);
        jobManager.addJob(job);

        // 执行job
        job.run().subscribe(state => {
            logger.info({ result: state }, "action done");
        }, err => {
            logger.error({ error: err }, "job error");
        }, () => {
            logger.info("all done");
            broker.RobotTeardown({account: jd.account}, (err, res) => {});
        });
    });
}

main();
