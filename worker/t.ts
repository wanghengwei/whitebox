import { timer } from "rxjs";
import pino from "pino";
// import "rxjs";

const logger = pino({prettyPrint: true});

timer(1000).subscribe(x => logger.info({item: x}, "get an item"));