"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Robot {
    constructor(acc) {
        this.properties = new Map();
        this.account = acc;
    }
    getProp(key) {
        return this.properties.get(key);
    }
}
exports.Robot = Robot;
