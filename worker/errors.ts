
// 表示 continue 一个loop节点
export class ContinueError implements Error {
    name: string = "ContinueError";
    message: string = "";
    tag: string;

    constructor(tag: string = "") {
        this.tag = tag;
    }
}

// 表示要 restart 整个用例
export class RestartError implements Error {
    name: string = "RestartError";
    message: string = "";
}

// 表示要重试当前动作
export class RetryError implements Error {
    name: string = "RetryError";
    message: string = "";
    lastResult: any;

    constructor(r: any) {
        this.lastResult = r;
    }
}