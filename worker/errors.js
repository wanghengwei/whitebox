"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContinueError {
    constructor(tag = "") {
        this.name = "ContinueError";
        this.message = "";
        this.tag = tag;
    }
}
exports.ContinueError = ContinueError;
