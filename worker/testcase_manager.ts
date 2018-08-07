import { Observable, bindNodeCallback, of } from "rxjs";
import { TestCase } from "./testcase";
import { readFile } from "fs";
import { map } from "rxjs/operators";
import { parse } from "fast-xml-parser";

class TestCaseManager {

    cache: Map<string, any> = new Map();

    findTestCase(id: string): Observable<TestCase> {
        let tc =this.cache.get(id);
        if (!tc) {
            let f = bindNodeCallback(readFile);
            return f(`${__dirname}/../${id}.xml`).pipe(
                map(data => {
                    let x = parse(data.toString(), { ignoreAttributes: false });
                    let tc = new TestCase(x);
                    this.cache.set(id, tc);
                    return tc;
                }),
            );
        } else {
            return of(tc);
        }
    }
}

export default new TestCaseManager();
