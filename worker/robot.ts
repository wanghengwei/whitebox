
export class Robot {
    constructor(public account: string, public playerData: any) {
    }

    putPlayerData(data: any) {
        this.playerData = {...this.playerData, ...data};
    }
}
