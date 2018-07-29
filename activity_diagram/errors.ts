
export class ContinueError implements Error {
    name: string = "ContinueError";
    message: string = "";
    tag: string;

    constructor(tag: string = "") {
        this.tag = tag;
    }
}