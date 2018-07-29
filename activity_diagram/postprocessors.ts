import ts from 'typescript'
import { ContinueError } from './errors';

// 后置处理器，比如判断结果然后终止act队列
export interface PostProcessor {
    invoke(rez: any, idx: number): any;
}

export class ContinuePostProcessor implements PostProcessor {
    condition: string = "";
    tag: string = "";

    parse(data: any): void {
        let cond = data['@_condition'] || "(true)";
        cond = `({
            run: (result: any, index: number) => {
                return (${cond});
            }
        })`;
        this.condition = ts.transpile(cond);
        this.tag = data['@_tag'];
    }

    invoke(rez: any, idx: number): any {
        let t = eval(this.condition);
        if (t.run(rez, idx)) {
            throw new ContinueError(this.tag);
        }

        return rez;
    }
}
