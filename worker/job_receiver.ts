import { Observable, range } from "rxjs";
import { map } from "rxjs/operators";
import jobManager from './job_manager';
import { JobTemplate } from "./job_template";

// 表示一个可以从某地接收job template的组件
// 正式环境下应该是从MQ获得
export interface JobReceiver {
    getJobs(): Observable<JobTemplate>;
}

class DummyJobReceiver implements JobReceiver {
    getJobs(): Observable<JobTemplate> {
        let cnt = Math.min(1, jobManager.currentCapacity());
        return range(3400001, cnt).pipe(
            map(acc => new JobTemplate(
                String(acc),
                "demo",
                // 这个数据的值需要是string。也许以后可以灵活点，不过现在就这样把
                {
                    "User.0.Address": "172.17.100.32",
                    "User.0.Port": "31000",
                    "ZONE_ID": "9999",
                    "ROOM_ID": "191",
                    "BUY_VIP_LEVEL": "5",
                })
            ),
        );
    }
}

export default new DummyJobReceiver();