"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const errors_1 = require("./errors");
class ContinuePostProcessor {
    constructor() {
        this.condition = "";
        this.tag = "";
    }
    parse(data) {
        let cond = data['@_condition'] || "(true)";
        cond = `({
            run: (result: any, index: number) => {
                return (${cond});
            }
        })`;
        this.condition = typescript_1.default.transpile(cond);
        this.tag = data['@_tag'];
    }
    invoke(rez, idx) {
        let t = eval(this.condition);
        if (t.run(rez, idx)) {
            throw new errors_1.ContinueError(this.tag);
        }
        return rez;
    }
}
exports.ContinuePostProcessor = ContinuePostProcessor;
