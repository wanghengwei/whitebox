import { EventEmitter } from "events";
import { interval, Subject, zip, empty, from, concat, timer, of } from "rxjs";
import { map, buffer, windowToggle, concatAll, windowCount, flatMap, ignoreElements } from "rxjs/operators";
import { clearInterval, setInterval } from "timers";
import broker from "./broker";
import { RestartError } from "./errors";
import { Job } from "./job";
import logger from "./logger";

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
    maxCapacity: number = 1000;
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
        let speedControlledJobs = this.jobsToBeRun.pipe(
            flatMap(j => concat(timer(1000).pipe(ignoreElements()), of(j))),
        );
        speedControlledJobs.subscribe(this);
    }

    addEventListeners() {
        // 处理心跳
        this.events.on('roomEntered', (job, action, args) => {
            job.heartBeatTimer = setInterval(() => {
                logger.info({ robot: args.connectionId.account }, "sendHearBeat");
                broker.ActionSendEventCEventVideoPlayerHeartBeatNotify({ connectionId: args.connectionId }, (err, res) => {
                    if (err || res.error) {
                        // 如果发送心跳错误，那应该是连接被断开了。停止发心跳
                        logger.info({robot: args.connectionId.account}, "stopHearBeat");
                        clearTimeout(job.heartBeatTimer);
                    }
                });
            }, 1000 * 10);
        });

        this.events.on('roomLeaved', (job) => {
            clearInterval(job.heartBeatTimer);
        });
    }

    next(job: Job) {
        job.run().subscribe(result => {
            // job执行的结果在这里就处理掉了
            // logger.info({ result }, "action done");
            // 有些result会触发一些event
            if (result.action.name == 'CEventVideoRoomEnterRoom' && result.ok()) {
                logger.debug("trigger event roomEntered");
                this.events.emit('roomEntered', job, result.action, result.args);
            }
        }, err => {
            // 这里是否所有的错误都是无法恢复的？
            logger.debug({ error: err }, "job error");
            job.teardownRobot();
            // 当一个job的执行队列失败时，应该怎么做？
            // 应该确保job对应的数据都清理掉，比如连接？
            // 然后重新执行？
            // 看看错误类型吧
            if (err instanceof RestartError) {
                logger.debug({ account: job.robot.account }, "restart job");
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
        logger.info({ capacity: this.curCapacity }, "add job");
        this.jobsToBeRun.next(job);
    }
}

export default new JobManagerImpl();
