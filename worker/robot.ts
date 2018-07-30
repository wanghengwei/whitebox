export class Robot {
    account: string;
    properties: Map<string, any> = new Map();

    constructor(acc: string) {
        this.account = acc;
    }

    getProp(key: string): any {
        return this.properties.get(key);
    }
}
