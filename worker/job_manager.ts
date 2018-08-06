import { Job } from "./job";
import { Subject, interval, zip, Observable } from "rxjs";
import logger from "./logger";
import { map } from "rxjs/operators";
import { RestartError } from "./errors";
import { EventEmitter } from "events";
import { Result } from "./activity";
import broker from "./broker";
import { setTimeout } from "timers";

export interface JobManager {
    // 必须调这个方法来启动
    start();

    // 把一个job添加到待执行队列里去
    addJob(job: Job);

    // 获得当前还有多少容量
    currentCapacity(): number;

    // 设置参数
    // 可用参数有：
    // - rate
    set(params: any);

    events: EventEmitter;
}

class JobManagerImpl implements JobManager {
    rate: number = 1;
    maxCapacity: number = 10;
    curCapacity: number = this.maxCapacity;

    events: EventEmitter = new EventEmitter();

    constructor() {

    }

    set(params: any) {
        this.rate = params.rate || this.rate;
        this.rate = Math.min(this.rate, 100);
    }

    start() {
        this.addEventListeners();

        let t = interval(1000);
        let speedControlledJobs = zip(t, this.jobsToBeRun.asObservable()).pipe(
            map(x => x[1]),
        );
        speedControlledJobs.subscribe(this);
    }

    addEventListeners() {
        // 处理心跳
        this.events.on('roomEntered', (job, metadata) => {
            job.heartBeatTimer = setTimeout(() => {
                logger.info({robot: metadata.args.connectionId.account}, "sendHearBeat");
                broker.ActionSendEventCEventVideoPlayerHeartBeatNotify({connectionId: metadata.args.connectionId}, (err, _) => {
                    if (err) {
                        // 如果发送心跳错误，那应该是连接被断开了。停止发心跳
                        clearTimeout(job.heartBeatTimer);
                    }
                });
            }, 1000 * 10);
        });

        this.events.on('roomLeaved', (job) => {
            clearTimeout(job.heartBeatTimer);
        });
    }

    next(job: Job) {
        job.run().subscribe(result => {
            // job执行的结果在这里就处理掉了
            logger.info({ result }, "action done");
            // 有些result会触发一些event
            if (result instanceof Result) {
                if (result.metadata.name == 'CEventVideoRoomEnterRoom' && result.ok()) {
                    logger.info("trigger event roomEntered");
                    this.events.emit('roomEntered', job, result.metadata);
                }
            }
        }, err => {
            // 这里是否所有的错误都是无法恢复的？
            logger.error({ error: err }, "job error");
            // 当一个job的执行队列失败时，应该怎么做？
            // 应该确保job对应的数据都清理掉，比如连接？
            // 然后重新执行？
            // 看看错误类型吧
            if (err instanceof RestartError) {
                logger.info({ account: job.robot.account }, "restart job");
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
        logger.error({ error: err }, "subscribeJobsToBeRun failed");
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
        logger.info({ current: this.curCapacity }, "addJob");
        this.jobsToBeRun.next(job);
    }
}

export default new JobManagerImpl();