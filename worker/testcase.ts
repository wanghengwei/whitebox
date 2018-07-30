import { CompositeActivity } from "./activities";
import { Robot } from "./robot";
import { Observable } from "rxjs";

export class TestCase {
    act: CompositeActivity;

    constructor(def: any) {
        this.act = new CompositeActivity();
        this.act.parse(def.test_case.template);
    }

    run(robot: Robot, stopNotifier: Observable<any>): Observable<any> {
        return this.act.proceed({ robot });
    }
}
