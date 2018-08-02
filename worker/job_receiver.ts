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
                playerProperties: {
                    // "User.0.Address": "172.17.100.32",
                    "User.0.Address": "172.17.100.101",
                    "User.0.Port": 31000,
                },
            },
            {
                account: "3400002",
                testCaseRef: "demo",
                playerProperties: {
                    "User.0.Address": "172.17.100.100",
                    "User.0.Port": 31000,
                },
            }]).pipe(
                take(1),
            );
    }
}

export default new DummyJobReceiver();