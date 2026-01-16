import { Pot } from "../../@types/Pot"
import { DeckService } from "../services/DeckService"
import { big_blind, small_blind } from "./Constants"
import { GameState } from "./GameState"
import { HandEvaluator } from "./HandEvaluator"
import { Player } from "./Player"

export class Table {
    readonly id: string

    //private players: Map<string, Player> = new Map()
    private players: Player[] = []
    private state = new GameState()
    private deckService = new DeckService()

    currentTurnIndex = 0
    dealerIndex = 0

    pots: Pot[] = []

    communityCards: string[] = []
    currentBet = 0
    minRaise = big_blind
    deckId: string | null = null

    constructor(id: string) {
        this.id = id

    }

    /*--------------------------------------PLAYER--------------------------------------------*/

    activePlayers() {
        //return [...this.players.values()].filter(p => !p.folded)
        return this.players.filter(p => !p.folded)
    }

    getPlayersAbleToAct() {
        //return this.activePlayers().filter(p => !p.allIn)
        return this.players.filter(p => p.canAct())
    }

    getCurrentPlayer() {
        return this.players[this.currentTurnIndex]
        //const players = this.getPlayersAbleToAct()
        //if (players.length === 0) throw new Error("Sem jogadores ativos")
        //return players[this.currentTurnIndex]
    }


    getPlayer(userId: string) {
        //const p = this.players.get(userId)
        const p = this.players.find(p => p.userId === userId)
        if (!p) throw new Error("Jogador inválido")
        return p
    }

    addPlayer({ userId, socketId }: { userId: string, socketId: string }) {
        if (this.players.some(p => p.userId === userId)) return
        this.players.push(new Player(userId, socketId))
    }

    removePlayer(userId: string) {
        //this.players.delete(userId)
        this.players = this.players.filter(p => p.userId !== userId)
    }

    isPlayerTurn(userId: string): boolean {
        return this.getCurrentPlayer()?.userId === userId
        /*try {
            return this.getCurrentPlayer().userId === userId
        } catch (err) {
            return false
        }*/
    }
    nextTurn() {
        const total = this.players.length
        for (let i = 1; i <= total; i++) {
            const idx = (this.currentTurnIndex + i) % total
            if (this.players[idx].canAct()) {
                this.currentTurnIndex = idx
                return
            }
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

        this.players.forEach(p => p.resetForNewHand())

        for (const p of this.players.values()) {
            p.resetForNewHand()
            const cards = await this.deckService.draw(this.deckId, 2)
            //p.hand = cards.map(c => c.code)
            p.setPlayerHand(cards.map(c => c.code))
        }

        this.postBlinds()
        this.setFirstTurnPreFlop()


        /*const players = this.activePlayers()
        if (players.length > 1) {
            this.currentTurnIndex = (this.dealerIndex + 1) % this.activePlayers().length
        } else {
            this.currentTurnIndex = 0
        }*/

    }

    postBlinds() {
        /*const players = [...this.players.values()]
        if (players.length < 2) return

        const sb = players[(this.dealerIndex + 1) % players.length]
        const bb = players[(this.dealerIndex + 2) % players.length]
        */
        const sbIndex = (this.dealerIndex + 1) % this.players.length
        const bbIndex = (this.dealerIndex + 2) % this.players.length

        this.players[sbIndex].bet(small_blind)
        this.players[bbIndex].bet(big_blind)

        /*sb.bet(small_blind)
        bb.bet(big_blind)*/

        this.currentBet = big_blind
        this.minRaise = big_blind
    }

    setFirstTurnPreFlop() {
        this.currentTurnIndex = (this.dealerIndex + 3) % this.players.length
        if (!this.players[this.currentTurnIndex].canAct()) {
            this.nextTurn()
        }
    }
    setFirstTurnPostFlop() {
        this.currentTurnIndex = (this.dealerIndex + 1) % this.players.length
        if (!this.players[this.currentTurnIndex].canAct())
            this.nextTurn()
    }



    isBettingRoundComplete() {
        const players = this.players.filter(p => !p.folded && !p.allIn)
        /*if (players.length === 0) return true
        return players.every(p => p.currentBet === this.currentBet)*/
        return players.every(p => p.currentBet === this.currentBet)
    }

    async onPlayerActionComplete() {
        if (this.activePlayers().length === 1) {
            this.resolvePots()
            const winner = this.activePlayers()[0]
            winner.stack += this.getTotalPot()
            /*this.pots = []
            this.state.endHand()*/
            this.endHand()
            return { winner: winner.userId }
        }

        if (!this.isBettingRoundComplete()) {
            this.nextTurn()
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
        //this.currentTurnIndex = 0
        this.setFirstTurnPostFlop()
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
                //this.players.get(best)!.stack += pot.amount
                this.getPlayer(best).stack += pot.amount
            }
        }
        /*this.state.endHand()
        this.pots = []*/
        this.endHand()

        return { winners: [...handRanks.keys()] }
    }

    endHand() {
        this.state.endHand()
        this.pots = []
        this.communityCards = []
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length
    }

    /* -------------------------------- POTS -------------------------------- */

    resolvePots() {
        //const players = this.activePlayers().filter(p => p.currentBet > 0)
        const bets = this.players.filter(p => p.currentBet > 0)
        const betLevels = [...new Set(bets.map(p => p.currentBet))].sort((a, b) => a - b)

        let prev = 0

        for (const lv of betLevels) {
            const eligible = bets.filter(p => p.currentBet >= lv)
            const amount = (lv - prev) * eligible.length

            this.pots.push({
                amount,
                eligibleUserIds: eligible.map(p => p.userId)
            })

            /*if (amount > 0) {
                this.pots.push({
                    amount,
                    eligibleUserIds: eligible.map(p => p.userId)
                })
            }*/

            prev = lv
        }

        bets.forEach(p => (p.currentBet = 0))

        /*for (const p of players) {
            p.currentBet = 0
        }*/
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


    getLobbyInfo() {
        return {
            tableId: this.id,
            phase: this.getPhase(),
            players: this.activePlayers().length,
            canJoin: this.isWaiting()
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
        return this.players.length === 0
    }

    markPlayerDisconnected(socketId: string) { //verificar se usar socketId é o melhor parametro, pq socketId muda se o navegador atualizar
        const p = this.players.find(p => p.socketId === socketId)
        if (!p) return

        p.socketId = ""

        if (!p.allIn && !p.folded) {
            p.folded = true

            if (this.isPlayerTurn(p.userId))
                this.nextTurn()
        }
        /*for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                player.socketId = ""
                if (!player.allIn) {
                    player.folded = true
                    if (this.isPlayerTurn(player.userId)) this.nextPlayer()
                }
                return
            }
        }*/
    }

    reconnectPlayer(userId: string, socketId: string) {
        const player = this.players.find(p => p.userId === userId)
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
