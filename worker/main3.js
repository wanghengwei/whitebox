"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_xml_parser_1 = require("fast-xml-parser");
require("fs");
const fs_1 = require("fs");
const activities_1 = require("./activities");
const logger_1 = __importDefault(require("./logger"));
fs_1.readFile(`${__dirname}/../demo.xml`, (err, data) => {
    let obj = fast_xml_parser_1.parse(data.toString(), { ignoreAttributes: false });
    // logger.info({obj: obj}, "parse file DONE");
    let ca = new activities_1.CompositeActivity();
    ca.parse(obj.test_case.template);
    ca.proceed().subscribe(rez => {
        logger_1.default.info({ result: rez }, "got result");
    }, err => {
        logger_1.default.error(err);
    }, () => {
        logger_1.default.info("all done");
    });
});
// console.log("hi");
