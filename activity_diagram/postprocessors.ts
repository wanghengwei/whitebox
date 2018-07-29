import ts from 'typescript'
import { ContinueError } from './errors';

// 后置处理器，比如判断结果然后终止act队列
export interface PostProcessor {
    invoke(ctx?: any): any;
}

export class ContinuePostProcessor implements PostProcessor {
    condition: string = "";
    tag: string = "";

    parse(data: any): void {
        let cond = data['@_condition'] || "(true)";
        cond = `({
            run: (ctx: any) => {
                return (${cond});
            }
        })`;
        this.condition = ts.transpile(cond);
        this.tag = data['@_tag'];
    }

    invoke(ctx?: any): any {
        let t = eval(this.condition);
        if (t.run(ctx)) {
            throw new ContinueError(this.tag);
        }
    }
}
