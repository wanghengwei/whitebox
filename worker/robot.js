"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Robot {
    constructor(acc) {
        this.account = acc;
    }
    getProp(key) {
        return this.properties[key];
    }
    setProperties(props) {
        this.properties = props;
    }
}
exports.Robot = Robot;
