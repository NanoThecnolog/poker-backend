import { Pot } from "../../@types/Pot"
import { DeckService } from "../services/DeckService"
import { big_blind, small_blind } from "./Constants"
import { GameState } from "./GameState"
import { HandEvaluator } from "./HandEvaluator"
import { Player } from "./Player"

export class Table {
    readonly id: string

    private players: Map<string, Player> = new Map()
    private state = new GameState()
    private deckService = new DeckService()


    pots: Pot[] = []
    currentTurnIndex = 0
    dealerIndex = 0
    deckId: string | null = null
    communityCards: string[] = []
    currentBet = 0
    minRaise = big_blind

    constructor(id: string) {
        this.id = id

    }

    /*--------------------------------------PLAYER--------------------------------------------*/

    activePlayers() {
        return [...this.players.values()].filter(p => !p.folded)
    }
    getPlayersAbleToAct() {
        return this.activePlayers().filter(p => !p.allIn)
    }
    getCurrentPlayer() {
        const players = this.getPlayersAbleToAct()
        if (players.length === 0) throw new Error("Sem jogadores ativos")
        return players[this.currentTurnIndex]
    }


    getPlayer(userId: string) {
        const p = this.players.get(userId)
        if (!p) throw new Error("Jogador inválido")
        return p
    }

    addPlayer({ userId, socketId }: { userId: string, socketId: string }) {
        if (!this.players.has(userId))
            this.players.set(userId, new Player(userId, socketId))
    }

    removePlayer(userId: string) {
        this.players.delete(userId)
    }

    isPlayerTurn(userId: string): boolean {
        try {
            return this.getCurrentPlayer().userId === userId
        } catch (err) {
            return false
        }
    }

    nextPlayer() {
        const players = this.getPlayersAbleToAct()
        if (players.length <= 1) return

        this.currentTurnIndex = (this.currentTurnIndex + 1) % players.length
    }

    /* -------------------------------- HAND FLOW -------------------------------- */

    async startHand() {
        this.deckId = await this.deckService.createDeck()
        this.communityCards = []
        this.pots = []
        this.currentBet = 0
        this.minRaise = big_blind
        this.state.startHand()

        for (const p of this.players.values()) {
            p.resetForNewHand()
            const cards = await this.deckService.draw(this.deckId, 2)
            p.hand = cards.map(c => c.code)
        }

        this.postBlinds()
        const players = this.activePlayers()
        if (players.length > 1) {
            this.currentTurnIndex = (this.dealerIndex + 1) % this.activePlayers().length
        } else {
            this.currentTurnIndex = 0
        }

    }

    postBlinds() {
        const players = [...this.players.values()]
        if (players.length < 2) return

        const sb = players[(this.dealerIndex + 1) % players.length]
        const bb = players[(this.dealerIndex + 2) % players.length]

        sb.bet(small_blind)
        bb.bet(big_blind)

        this.currentBet = big_blind
    }



    isBettingRoundComplete() {
        const players = this.activePlayers().filter(p => !p.allIn)
        if (players.length === 0) return true
        return players.every(p => p.currentBet === this.currentBet)
    }

    async onPlayerActionComplete() {
        if (this.activePlayers().length === 1) {
            this.resolvePots()
            const winner = this.activePlayers()[0]
            winner.stack += this.getTotalPot()
            this.pots = []
            this.state.endHand()
            return { winner: winner.userId }
        }

        if (!this.isBettingRoundComplete()) {
            this.nextPlayer()
            return
        }
        this.resolvePots()
        this.currentBet = 0
        this.minRaise = big_blind

        return await this.nextPhase()
    }

    async nextPhase() {
        this.state.next()
        const phase = this.state.getPhase()

        if (!this.deckId) return

        if (phase === 'flop') {
            const c = await this.deckService.draw(this.deckId, 3)
            this.communityCards.push(...c.map(x => x.code))
        }
        if (phase === "turn" || phase === "river") {
            const c = await this.deckService.draw(this.deckId, 1)
            this.communityCards.push(c[0].code)
        }

        if (phase === "showdown") {
            return this.finishHand()
        }

        //this.currentTurnIndex = this.dealerIndex % this.activePlayers().length
        this.currentTurnIndex = 0
    }

    finishHand() {
        const handRanks = new Map<string, ReturnType<typeof HandEvaluator.evaluate>>()

        for (const p of this.activePlayers()) {
            handRanks.set(
                p.userId,
                HandEvaluator.evaluate([...p.hand, ...this.communityCards])
            )
        }

        for (const pot of this.pots) {
            let best: string | null = null
            let value = -Infinity

            for (const uid of pot.eligibleUserIds) {
                const rank = handRanks.get(uid)
                if (rank && rank.value > value) {
                    value = rank.value
                    best = uid
                }
            }

            if (best) {
                this.players.get(best)!.stack += pot.amount
            }
        }
        this.state.endHand()
        this.pots = []

        return { winners: [...handRanks.keys()] }
    }

    /* -------------------------------- POTS -------------------------------- */

    resolvePots() {
        const players = this.activePlayers().filter(p => p.currentBet > 0)
        const betLevels = [...new Set(players.map(p => p.currentBet))].sort((a, b) => a - b)

        let prev = 0

        for (const lv of betLevels) {
            const eligible = players.filter(p => p.currentBet >= lv)
            const amount = (lv - prev) * eligible.length

            if (amount > 0) {
                this.pots.push({
                    amount,
                    eligibleUserIds: eligible.map(p => p.userId)
                })
            }

            prev = lv
        }

        for (const p of players) {
            p.currentBet = 0
        }
    }
    getTotalPot() {
        return this.pots.reduce((sum, p) => sum + p.amount, 0)
    }

    /* -------------------------------- STATE / SOCKET -------------------------------- */

    getPublicState(uid?: string) {
        return {
            tableId: this.id,
            phase: this.state.getPhase(),
            pot: this.getTotalPot(),
            communityCards: this.communityCards,
            dealerIndex: this.dealerIndex,
            turnUserId: this.getPlayersAbleToAct()[this.currentTurnIndex]?.userId,
            minRaise: this.minRaise,
            currentBet: this.currentBet,
            players: [...this.players.values()].map((p) => ({
                userId: p.userId,
                stack: p.stack,
                folded: p.folded,
                allIn: p.allIn,
                isYou: p.userId === uid,
                hand: p.userId === uid ? p.hand : undefined
            })),
        }
    }

    getPhase() {
        return this.state.getPhase()
    }

    isWaiting() {
        return this.state.isWaiting()
    }

    isBettingPhase() {
        return this.state.isBettingPhase()
    }

    hasSocket(socketId: string): boolean {
        return [...this.players.values()].some(p => p.socketId === socketId)
    }

    isEmpty(): boolean {
        return this.players.size === 0
    }

    markPlayerDisconnected(socketId: string) {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                player.socketId = ""
                if (!player.allIn) {
                    player.folded = true
                    if (this.isPlayerTurn(player.userId)) this.nextPlayer()
                }
                return
            }
        }
    }
    reconnectPlayer(userId: string, socketId: string) {
        const player = this.players.get(userId)
        if (!player) return
        player.socketId = socketId
    }

    /*
    resetActions() {
        for (const p of this.players.values())
            if (!p.folded) p.currentBet = 0
    }
     */

    /* -------------------------------- VALIDATIONS -------------------------------- */

    canPlayerCheck(userId: string) {
        const player = this.getPlayer(userId)
        return player.currentBet === this.currentBet
    }

    canPlayerCall(userId: string) {
        const player = this.getPlayer(userId)
        return this.currentBet > player.currentBet
    }

    canPlayerBet() {
        return this.currentBet === 0
    }

    canPlayerRaise(amount: number) {
        return amount >= this.minRaise
    }
}
