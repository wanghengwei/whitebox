// event 表示 x51 和 mgc 的消息，即 IEvent

export enum Order {
    Request = "Request", 
    Response = "Response",
}

export abstract class Event {

    constructor(protected doc: any) { }

    order(): Order {
        return this.doc.order;
    }

    name(): string {
        let name = this.doc.metadata ? this.doc.metadata.name : null;
        if (name) {
            return name;
        } else {
            // eventName 有可能不存在，比如写的不规范等等。因此需要加入校验机制 TODO
            return this.doc.spec.eventName;
        }
    }

    fullName(): string {
        return this.constructor.name + this.name();
    }

    headerFileName(): string {
        return `${this.fullName()}.h`;
    }

    cppFileName(): string {
        return `${this.fullName()}.cpp`;
    }

    outputFileNames(): string[] {
        return [this.headerFileName(), this.cppFileName()];
    }

    includeHeaders(): string[] {
        if (!this.doc.metadata) {
            return []
        }

        if (!this.doc.metadata.include_headers) {
            return [];
        }
        
        return this.doc.metadata.include_headers;
    }
}

export class EventRequest extends Event {
    playerDataKeys(): string[] {
        let params =this.doc.spec.params;
        if (!params) {
            return [];
        }

        return params.map(p => p.fromPlayerData).filter(k => k);
    }
}

export class EventResponse extends Event {

}
