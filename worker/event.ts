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

    eventName(): string {
        return this.doc.spec.eventName;
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
        let params = this.doc.spec.params;
        if (!params) {
            return [];
        }

        return params.map(p => p.fromPlayerData).filter(k => k);
    }

    params(): EventRequestParameter[] {
        if (!this.doc.spec.params) {
            return [];
        }

        return this.doc.spec.params.map(x => new EventRequestParameter(x));
    }
}

enum EventRequestParameterType {
    String = "String",
    Int = "Int",
    Symbol = "Symbol",
    LongLong = "LongLong",
}

class EventRequestParameterValue {
    constructor(readonly data: any, readonly type: EventRequestParameterType) {

    }

    expression(): string {
        if (this.data.fromPlayerData) {
            return `request.data().at("${this.data.fromPlayerData}")`;
        }

        if (this.data.constant) {
            if (this.type == EventRequestParameterType.String) {
                return `${JSON.stringify(this.data.constant)}`;
            } else {
                return `${this.data.constant}`
            }
        }

        if (this.data.expression) {
            return `${this.data.expression}`;
        }

        throw new Error("invalid value");
    }

    castFunc(): string {
        if (this.type == EventRequestParameterType.Int) {
            return "boost::lexical_cast<int>";
        }

        if (this.type == EventRequestParameterType.LongLong) {
            return "boost::lexical_cast<long long>";
        }

        return "";
    }
}

class EventRequestParameter {
    field: string;
    type: EventRequestParameterType;
    value: EventRequestParameterValue;

    constructor(data: any) {
        this.field = data.field;
        this.type = (data.type || EventRequestParameterType.String);
        this.value = new EventRequestParameterValue(data.value, this.type);
    }
}

export class EventResponse extends Event {

}
