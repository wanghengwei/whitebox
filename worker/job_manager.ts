import { Job } from "./job";
import { Subject, interval, zip, Observable } from "rxjs";
import logger from "./logger";
import { map } from "rxjs/operators";
import { RestartError } from "./errors";

export interface JobManager {
    // 把一个job添加到待执行队列里去
    addJob(job: Job);

    // 必须调这个方法来启动
    start();

    currentCapacity(): number;

    // 设置参数
    // 可用参数有：
    // - rate
    set(params: any);
}

class JobManagerImpl implements JobManager {
    rate: number = 1;

    set(params: any) {
        this.rate = params.rate || this.rate;
        this.rate = Math.min(this.rate, 100);
    }

    maxCapacity: number = 10;
    curCapacity: number = this.maxCapacity;

    constructor() {
        
    }

    start() {
        let t = interval(3000);
        let speedControlledJobs = zip(t, this.jobsToBeRun.asObservable()).pipe(
            map(x => x[1]),
        );
        speedControlledJobs.subscribe(this);
    }

    next(job: Job) {
        job.run().subscribe(result => {
            logger.info({ result }, "action done");
        }, err => {
            // 这里是否所有的错误都是无法恢复的？
            logger.error({ error: err }, "job error");
            // 当一个job的执行队列失败时，应该怎么做？
            // 应该确保job对应的数据都清理掉，比如连接？
            // 然后重新执行？
            // 看看错误类型吧
            if (err instanceof RestartError) {
                logger.info({account: job.robot.account}, "restart job");
                this.jobsToBeRun.next(job);
            } else {
                this.curCapacity++;
            }
        }, () => {
            logger.info("job done");
            job.teardownRobot();
            // 当一个job执行完后，就没必要方回去了，over就好
            this.curCapacity++;
        });
    }

    error(err: any) {
        logger.error({error: err}, "subscribeJobsToBeRun failed");
    }

    complete() {
        logger.info("no more jobs");
    }

    currentCapacity(): number {
        // return this.maxCapacity - this.jobs.length;
        return this.curCapacity;
    }

    jobs: Array<Job> = [];

    jobsToBeRun: Subject<Job> = new Subject();

    addJob(job: Job) {
        // this.jobs.push(job);
        this.curCapacity--;
        logger.info({current: this.curCapacity}, "addJob");
        this.jobsToBeRun.next(job);
    }
}

export default new JobManagerImpl();