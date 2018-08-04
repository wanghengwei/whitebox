import { Observable } from "rxjs";

export interface Metadata {
  type: string;
}


// 动作的返回值。
// 有些动作没有返回，比如sleep
// 对于send这些动作，返回值是一个枚举
// 业务act如果失败了，是作为一个item，到js这边处理。换句话说，Result必须要能反映是否失败，如果失败，必须有失败信息；如果成功，需要有数据。
export class Result {
  // 动作基本信息
  // metadata: Metadata;
  // 错误信息。null表示没有错误
  error: any;

  constructor(public metadata: Metadata, err?: any) {
    // this.metadata = metadata;

    if (!err || err.ok) {
      this.error = null;
    } else {
      this.error = err;
    }
  }

  ok(): boolean {
    return this.error == null;
  }
}

export interface Activity {
  parse(data: any): void;

  // 每个act执行结果不一定是一个结果，因为有类似loop这种act存在。
  proceed(ctx: any): Observable<any>;
}

