import { from, Observable, range } from "rxjs";
import { take, map } from "rxjs/operators";
import { JobDef } from "./job_def";
import jobManager from './job_manager';

interface JobReceiver {
    getJobs(): Observable<JobDef>;
}

class DummyJobReceiver implements JobReceiver {
    getJobs(): Observable<JobDef> {
        let cnt = Math.min(1, jobManager.currentCapacity());
        return range(3400001, cnt).pipe(
            map(acc => ({
                account: String(acc),
                testCaseRef: "demo",
                // 这个数据的值需要是string。也许以后可以灵活点，不过现在就这样把
                playerData: {
                    "User.0.Address": "172.17.100.32",
                    // "User.0.Address": "172.17.100.101",
                    "User.0.Port": "31000",
                    "ZONE_ID": "9999",
                    "ROOM_ID": "191",
                },
            })),
        );
    }
}

export default new DummyJobReceiver();