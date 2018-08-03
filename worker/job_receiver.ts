import { from, Observable } from "rxjs";
import { take } from "rxjs/operators";
import { JobDef } from "./job_def";

interface JobReceiver {
    getJobs(): Observable<JobDef>;
}

class DummyJobReceiver implements JobReceiver {
    getJobs(): Observable<JobDef> {
        return from([
            {
                account: "3400001",
                testCaseRef: "demo",
                // 这个数据的值需要是string。也许以后可以灵活点，不过现在就这样把
                playerData: {
                    // "User.0.Address": "172.17.100.32",
                    "User.0.Address": "172.17.100.101",
                    "User.0.Port": "31000",
                    "ZONE_ID": "9999",
                },
            },
            {
                account: "3400002",
                testCaseRef: "demo",
                playerData: {
                    "User.0.Address": "172.17.100.100",
                    "User.0.Port": "31000",
                },
            }]).pipe(
                take(1),
            );
    }
}

export default new DummyJobReceiver();