import { Observable } from "rxjs";

export interface Metadata {
  type: string;
  name: string;
}


// action 的返回值。
// 有些动作没有返回，比如sleep
// 业务act Result必须要能反映是否失败，如果失败，必须有失败信息；如果成功，需要有数据?。
export class ActionResult {
  // // 动作基本信息
  // // metadata: Metadata;
  // // 错误信息。null表示没有错误
  // error: any;

  // constructor(public metadata: Metadata, err?: any) {
  //   // this.metadata = metadata;

  //   if (!err || err.ok) {
  //     this.error = null;
  //   } else {
  //     this.error = err;
  //   }
  // }

  // 一个动作的结果包含3个信息：
  // 1. 是哪个动作
  // 2. 调用的参数是啥
  // 3. 结果是啥
  constructor(public result: any, public action: any, public args: any) {}

  ok(): boolean {
    return !this.result.error;
  }

}

export interface Activity {
  parse(data: any): void;

  // 每个act执行结果不一定是一个结果，因为有类似loop这种act存在。
  proceed(ctx: any): Observable<ActionResult>;
}
