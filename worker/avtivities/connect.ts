import { bindNodeCallback, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ActionResult, Metadata } from "../activity";
import broker from "../broker";
import logger from "../logger";
import { Robot } from "../robot";
import { SimpleActivity } from "./simple";

// 表示一个连接服务器的动作
export class ConnectActionActivity extends SimpleActivity {

  service: string = "";
  connectionIndex: number = 0;
  addressKey: string = "";
  portKey: string = "";

  constructor() {
    super();
    this.onErrorHandler = "restart";
  }

  doParse(data: any) {
    this.service = data['@_service'];
    this.connectionIndex = Number(data['@_conn']) || 0;
    this.addressKey = data['@_address'] || `${this.service}.${this.connectionIndex}.Address`;
    this.portKey = data['@_port'] || `${this.service}.${this.connectionIndex}.Port`;

    logger.debug({action: this}, "ConnectActionActivity parsed");
  }

  doProceed(ctx: any): Observable<any> {
    let robot: Robot = ctx.robot;

    let f = (args: any, cb: any) => {
      // let metadata = new ConnectMetadata(args);
      logger.info({ args }, "Connect");
      broker.Connect(args, (error: any, result: any) => {
        if (error) {
          logger.fatal({ grpc_error: error }, "Connect FAILED");
        } else if (result.error) {
          logger.error({ error: result.error }, "Connect FAILED");
        } else {
          logger.info({ result }, "Connect OK");
        }

        cb(error, result);
      });
    };

    let args = {
      connectionId: {
        service: this.service,
        account: robot.account,
        index: this.connectionIndex,
      },
      address: robot.playerData[this.addressKey],
      port: Number(robot.playerData[this.portKey]),
      password: "",
    };

    return bindNodeCallback(f)(args).pipe(
      // 返回的是broker返回的result。如果grpc的错误，不会走这里，直接作为队列错误了。
      map((x: any) => {
        // logger.info({x}, `map result of connect`);
        return new ActionResult(x, { name: "Connect" }, args);
      }),
    );
  }
}
