import { delay, filter, catchError, ignoreElements, map } from "rxjs/operators";
import { Result, Activity } from "../activity";
import { Observable, concat, of, timer } from "rxjs";
import { ContinuePostProcessor, PostProcessor } from "../postprocessors";
import { RestartError, RetryError } from "../errors";

// 表示简单act，只返回最多一个结果的。和loop那种不一样。
// 子类应该实现doParse & doProceed
export abstract class SimpleActivity implements Activity {
    postprocessor?: PostProcessor;
    // 默认动作与动作之间间隔1秒。最好是可配
    delayTime: number = 1000;
    // 错误处理策略。这个会在postprocessor之前处理。默认是ignore。如果要修改默认值，子类应当在构造函数里赋值。
    // 最终这个值都会被xml的on_error属性覆盖
    onErrorHandler: string = "ignore";
  
    parse(data: any): void {
      this.parsePostprocessor(data.postprocessor);
      this.onErrorHandler = data['@_on_error'] || this.onErrorHandler;
      this.doParse(data);
    }
  
    proceed(ctx: any): Observable<any> {
      return this.doProceed(ctx).pipe(
        // 执行on_error的handler
        map(r => {
          // logger.info(`on_error is ${this.onErrorHandler}`);
          if (r == undefined || !r.error) {
            // 没有错误
            return r;
          }
  
          if (this.onErrorHandler == 'restart') {
            // 如果 on_error="restart" ，那么应当重新执行整个用例。
            // 做法就是抛出个错误，让最顶层去catchError
            // 不过这里有个问题，丢失了一次运行结果
            throw new RestartError(r);
          } else if (this.onErrorHandler == 'retry') {
            // 重试当前动作
            throw new RetryError(r);
          } else {
            // 其他情况就当作ignore
            return r;
          }
        }),
        catchError((err, caught) => {
          if (err instanceof RetryError) {
            // 重新执行当前动作
            // 不过要把之前的结果也附带上，因为统计时要计算
            return concat(of(err.lastResult), timer(2000).pipe(ignoreElements()), this.proceed(ctx));
          }
  
          throw err;
        }),
        // 执行后置处理器
        // 要求所有act都要返回点东西，不能是empty
        map((x, idx) => {
          if (!this.postprocessor) {
            return x;
          }
  
          return this.postprocessor.invoke(x, idx);
        }),
        // 延迟执行
        delay(this.delayTime),
        // 最终只返回Result类型的对象
        filter(x => x instanceof Result)
      );
    }
  
    abstract doProceed(ctx: any): Observable<any>;
  
    abstract doParse(data: any): void;
  
    parsePostprocessor(data: any): void {
      // 解析postprocessor
      if (data) {
        let pp = null;
        if (data["@_type"] == "continue") {
          pp = new ContinuePostProcessor();
        }
  
        if (pp) {
          pp.parse(data);
          this.postprocessor = pp;
        }
      }
    }
  }
  
  