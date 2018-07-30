import { Observable, bindNodeCallback } from "rxjs";
import { TestCase } from "./testcase";
import { readFile } from "fs";
import { map } from "rxjs/operators";
import { parse } from "fast-xml-parser";

class TestCaseManager {

    findTestCase(id: string): Observable<TestCase> {
        let f = bindNodeCallback(readFile);
        return f(`${__dirname}/../${id}.xml`).pipe(
            map(data => {
                let x = parse(data.toString(), { ignoreAttributes: false });
                return new TestCase(x);
            }),
        );
    }
}

export default new TestCaseManager();
