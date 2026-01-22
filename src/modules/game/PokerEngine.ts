//regras do poker

import { PlayerAction } from "../../@types/PlayerActions"
import { Table } from "./Table"

export class PokerEngine {

    private static ensureCanAct(table: Table) {
        if (table.isWaiting()) throw new Error("Não há mão em andamento")

        if (!table.isBettingPhase()) throw new Error("Ações não permitidas nesta fase")
    }

    static execute(
        table: Table,
        userId: string,
        action: PlayerAction,
        amount?: number
    ) {
        if ((action === PlayerAction.BET || action === PlayerAction.RAISE) && (amount == null || amount <= 0 || !amount))
            throw new Error("informe um valor válido")

        switch (action) {
            case PlayerAction.FOLD:
                return this.fold(table, userId)

            case PlayerAction.CHECK:
                return this.check(table, userId)

            case PlayerAction.CALL:
                return this.call(table, userId)

            case PlayerAction.BET:
                return this.bet(table, userId, amount!)

            case PlayerAction.RAISE:
                return this.raise(table, userId, amount!)

            case PlayerAction.ALLIN:
                return this.allIn(table, userId)

            case PlayerAction.PREPARED:
                return this.playerReady(table, userId)

            case PlayerAction.UNPREPARED:
                return this.playerUnready(table, userId)

            default:
                throw new Error("Ação inválida")
        }
    }

    static fold(table: Table, userId: string) {
        this.ensureCanAct(table)
        table.getPlayer(userId).fold()
    }

    static call(table: Table, userId: string) {
        this.ensureCanAct(table)
        if (!table.canPlayerCall(userId)) throw new Error("Nada para pagar")

        const player = table.getPlayer(userId)

        const diff = table.currentBet - player.currentBet
        if (diff < 0) throw new Error("Estado inválido de aposta")

        //if (diff === 0) throw new Error("Use check quando não há aposta para pagar")

        player.bet(diff)

        /*table.pot += player.bet(diff)
        table.nextTurn()*/
        //player.currentBet += amount
    }

    static bet(table: Table, userId: string, amount: number) {
        this.ensureCanAct(table)
        if (!table.canPlayerBet()) throw new Error("Aposta inválida, use raise")

        if (amount < table.minRaise) throw new Error(`Aposta mínima: ${table.minRaise}`)

        const player = table.getPlayer(userId)
        player.bet(amount)

        table.currentBet = player.currentBet
        table.minRaise = amount
    }

    static raise(table: Table, userId: string, amount: number) {
        this.ensureCanAct(table)
        if (!table.canPlayerRaise(amount)) throw new Error(`Raise mínimo: ${table.minRaise}`)

        const player = table.getPlayer(userId)
        const toCall = table.currentBet - player.currentBet
        const total = toCall + amount

        if (total <= 0) throw new Error("Raise inválido")

        player.bet(total)

        table.currentBet = player.currentBet
        table.minRaise = amount
        /*
        //this.call(table, userId, amount)
        table.pot += player.bet(total)
        table.currentBet = player.currentBet
        table.minRaise = amount

        table.resetActions()
        table.nextTurn()
        */
    }

    static check(table: Table, userId: string) {
        this.ensureCanAct(table)

        if (!table.canPlayerCheck(userId)) throw new Error("Check inválido")
        /*
            const player = table.getPlayer(userId)
            if (player?.currentBet !== table.currentBet) throw new Error("Check inválido")
        */
    }

    static allIn(table: Table, userId: string) {
        this.ensureCanAct(table)

        const p = table.getPlayer(userId)

        if (p.stack <= 0)
            throw new Error("Jogador sem fichas")

        const toCall = table.currentBet - p.currentBet
        const allInAmount = p.stack

        p.bet(allInAmount)
        p.allIn = true

        const totalBet = p.currentBet

        if (totalBet > table.currentBet) {
            const raiseValue = totalBet - table.currentBet

            if (raiseValue >= table.minRaise) {
                table.minRaise = raiseValue
            }

            table.currentBet = totalBet
        }
    }
    static playerReady(table: Table, uid: string) {
        const p = table.getPlayer(uid)
        p.setPlayerReady()
    }
    static playerUnready(table: Table, uid: string) {
        const p = table.getPlayer(uid)
        p.setPlayerUnready()
    }
}
