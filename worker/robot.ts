export class Robot {
    account: string;
    properties: any;

    constructor(acc: string) {
        this.account = acc;
    }

    getProp(key: string): any {
        return this.properties[key];
    }

    setProperties(props: any) {
        this.properties = props;
    }
}
