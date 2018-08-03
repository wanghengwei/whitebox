import { Observable, of } from "rxjs";
import { SimpleActivity } from "./simple";
import { repeat, tap } from "rxjs/operators";
import logger from "../logger";
import { CompositeActivity } from "./composite";

export class SleepActivity extends SimpleActivity {
    doParse(data: any): void {
      let sec = Number(data["@_seconds"]) || 0;
      this.delayTime = sec * 1000;
    }
  
    doProceed(ctx: any): Observable<any> {
      return of(true);
    }
  }
  
  