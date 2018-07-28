"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const pino_1 = __importDefault(require("pino"));
// import "rxjs";
const logger = pino_1.default({ prettyPrint: true });
rxjs_1.timer(1000).subscribe(x => logger.info({ item: x }, "get an item"));
