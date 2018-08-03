import { SimpleActivity } from "./simple";
import { CompositeActivity } from "./composite";
import logger from "../logger";
import { Observable, race } from "rxjs";
import { takeLast } from "rxjs/operators";

// 表示一个多选一的分支图。使用场景：同时等待多个event从服务器返回，只取第一个返回的值。
export class SelectActivity extends SimpleActivity {
    forks: Array<CompositeActivity> = [];
  
    doParse(data: any) {
      if (!data.fork || !Array.isArray(data.fork)) {
        logger.warn("invalid synchronization activity");
      }
  
      data.fork.forEach((x: any) => {
        let ca = new CompositeActivity();
        ca.parse(x);
        this.forks.push(ca);
      });
    }
  
    doProceed(ctx: any): Observable<any> {
      logger.info({ forks: this.forks }, "select");
  
      let rs = this.forks.map(act => act.proceed(ctx));
      return race(rs).pipe(takeLast(1));
    }
  }
  