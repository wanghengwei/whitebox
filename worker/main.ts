import { Job } from './job';
import jobManager from './job_manager';
import jobReceiver from './job_receiver';
import logger from './logger';

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
            // broker.RobotTeardown({account: jd.account}, (err, res) => {});
            job.teardownRobot();
        });
    });
}

main();
