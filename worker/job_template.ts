
// 用于启动一个job的描述信息
export class JobTemplate {
    constructor(public account: string, public testCaseRef: string, public playerData: any) {}
}
