import { parse } from 'fast-xml-parser';
import 'fs';
import { readFile } from 'fs';
import { CompositeActivity } from './activities';
import logger from './logger';

readFile(`${__dirname}/../demo.xml`, (err, data) => {
    let obj = parse(data.toString(), { ignoreAttributes: false });
    // logger.info({obj: obj}, "parse file DONE");

    let ca = new CompositeActivity();
    ca.parse(obj.test_case.template);
    ca.proceed().subscribe(rez => {
        logger.info({ result: rez }, "got result");
    }, err => {
        logger.error(err);
    }, () => {
        logger.info("all done");
    });
});

// console.log("hi");
