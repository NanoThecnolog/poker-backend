//eventos da mesa

import { Server, Socket } from "socket.io"
import { TableStore } from "../store/TableStore"

export function registerTableHandlers(io: Server, socket: Socket) {


    socket.on("table:create", () => {

    })
    socket.on("table:list", () => {
        const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
        socket.emit("table:list", tables)
    })

    socket.on("table:join", ({ tableId, userId }) => {
        const table = TableStore.ensureTable(tableId)


        if (!table.isWaiting()) {
            socket.emit("table:error", { message: "Mesa já em andamento" })
            return
        }

        const players = table.activePlayers()
        console.log("Jogadores na mesa: ", players)

        //if (players.length > 0) {
        const hasPlayer = players.some(p => p.userId === userId)
        if (hasPlayer) {
            console.log("reconectando jogador", userId)
            table.reconnectPlayer(userId, socket.id)
        } else {
            table.addPlayer({ userId, socketId: socket.id })
            console.log("jogador entrou na mesa", userId)
        }
        /*} else {
            table.addPlayer({
                userId,
                socketId: socket.id
            })
            console.log("jogador entrou na mesa", userId)
        }*/


        socket.join(tableId)

        // envia estado apenas para quem entrou
        socket.emit("table:state", table.getPublicState(userId))


        // avisa os outros jogadores
        socket.to(tableId).emit("table:playerJoined", {
            userId
        })
    })

    socket.on("table:leave", ({ tableId, userId }) => {
        const table = TableStore.getOnly(tableId)
        if (!table) return

        table.removePlayer(userId)
        socket.leave(tableId)

        io.to(tableId).emit("table:playerLeft", { userId })
    })


    socket.on("table:start-hand", async ({ tableId }) => {
        const table = TableStore.getOnly(tableId)
        if (!table) return

        if (!table.isWaiting()) return
        if (table.activePlayers().length < 2) return

        await table.startHand()

        io.to(tableId).emit("table:update", table.getPublicState())
    })


    socket.on("disconnect", () => {
        const tables = TableStore.findBySocket(socket.id)

        for (const table of tables) {
            table.markPlayerDisconnected(socket.id)
            io.to(table.id).emit("table:update", table.getPublicState())
        }
    })

}
