//estado do jogador



export class Player {
    readonly userId: string
    socketId: string

    hand: string[] = []
    stack: number
    currentBet = 0
    folded = false
    allIn = false


    constructor(userId: string, socketId: string, stack = 1000) {
        this.userId = userId
        this.socketId = socketId
        this.stack = stack
    }

    bet(amount: number) {
        if (this.folded)
            throw new Error("Jogador foldado não pode apostar")

        if (amount <= 0) return 0

        const value = Math.min(amount, this.stack)

        this.stack -= value
        this.currentBet += value

        if (this.stack === 0) this.allIn = true

        return value
    }

    canAct() {
        return !this.folded && !this.allIn
    }

    resetForNewHand() {
        this.hand = []
        this.currentBet = 0
        this.folded = false
        this.allIn = false
    }
}
