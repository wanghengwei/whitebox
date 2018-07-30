import { Observable, of, from } from "rxjs";
import { JobDef } from "./job_def";
import { take } from "rxjs/operators";

interface JobReceiver {
    getJobs(): Observable<JobDef>;
}

class DummyJobReceiver implements JobReceiver {
    getJobs(): Observable<JobDef> {
        return from([
            {
                account: "1000",
                testCaseRef: "demo",
                playerProperties: {
                    "User.0.Address": "172.17.100.100",
                    "User.0.Port": 31000,
                },
            },
            {
                account: "1001",
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