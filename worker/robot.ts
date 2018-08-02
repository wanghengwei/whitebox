import logger from "./logger";

export class Robot {
    properties: Map<string, string>;

    constructor(public account: string) {
    }

    getProp(key: string): string {
        return this.properties.get(key);
    }

    setProperties(props: any) {
        this.properties = new Map(Object.entries(props));
    }
}
