import { Job } from './job';
import jobManager from './job_manager';
import jobReceiver from './job_receiver';
import logger from './logger';

function main() {
    jobManager.set({
        rate: 1,
    });
    
    jobManager.start();

    jobReceiver.getJobs().subscribe(jd => {
        logger.info({ job: jd }, `received a job`);

        // 为了控制速率，不再拿到job就立刻创建并启动。需要有一个队列来控制一下。

        // 创建job
        let job = new Job(jd);

        // jobManager.prepareToRun(job);
        jobManager.addJob(job);

    });
}

main();
