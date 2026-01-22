//estado do jogador



export class Player {
    readonly userId: string
    socketId: string

    hand: string[] = []
    stack: number
    currentBet = 0
    folded = false
    allIn = false
    ready: boolean
    connected: boolean = true


    constructor(userId: string, socketId: string, stack = 1000) {
        this.userId = userId
        this.socketId = socketId
        this.stack = stack
        this.ready = false
    }
    addCard(card: string) {
        if (this.hand.length >= 2) throw new Error("Jogador já possui cartas na mão")

        this.hand.push(card)
    }

    setPlayerHand(cards: string[]) {
        if (cards.length !== 2) throw new Error("Quantidade de cartas inválida")

        this.hand = cards
    }

    clearHand() {
        this.hand = []
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

    resetBetForRound() {
        this.currentBet = 0
    }

    fold() {
        this.folded = true
    }

    canAct() {
        return !this.folded && !this.allIn
    }
    isActive() {
        return !this.folded && !this.allIn
    }

    resetForNewHand() {
        this.hand = []
        this.currentBet = 0
        this.folded = false
        this.allIn = false
    }

    setPlayerReady() {
        this.ready = true
    }
    setPlayerUnready() {
        this.ready = false
    }
}
