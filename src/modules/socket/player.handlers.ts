//eventos do jogador

import { Server, Socket } from "socket.io"
import { TableStore } from "../store/TableStore"
import { PokerEngine } from "../game/PokerEngine"
import { PlayerAction } from "../../@types/PlayerActions"

type HandlerProps = {
    tableId: string,
    userId: string,
    action: PlayerAction,
    amount?: number
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
    socket.on("player:action",
        async ({ tableId, userId, action, amount }: HandlerProps) => {
            const table = TableStore.getOnly(tableId)
            if (!table) return

            // valida se é a vez do jogador
            if (!table.isPlayerTurn(userId)) {
                console.log("Não é a vez do jogador", userId)
                socket.emit("player:error", { message: "Não é sua vez" })
                return
            }
            console.log(`Jogador ${userId} executando ação ${action}`)

            try {
                PokerEngine.execute(
                    table,
                    userId,
                    action,
                    amount
                )

                const result = await table.onPlayerActionComplete()

                io.to(tableId).emit("table:update", table.getPublicState())

                if (result) {
                    io.to(tableId).emit("game:end", result)
                }

            } catch (err: any) {
                socket.emit("player:error", { message: err.message })
            }
        })
}
