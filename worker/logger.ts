import pino from 'pino';

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

let loggerParam: any = null;

if (process.env.NODE_ENV == 'production') {
    loggerParam = {
        prettyPrint: false,
    };
} else {
    loggerParam = {
        prettyPrint: true,
        level: 'debug',
    };
}

export default pino(loggerParam);
