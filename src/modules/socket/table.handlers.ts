//eventos da mesa

import { Server, Socket } from "socket.io"
import { TableStore } from "../store/TableStore"

export function registerTableHandlers(io: Server, socket: Socket) {


    socket.on("table:new", () => {
        console.log("criando mesa")
        TableStore.create()
        const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
        io.emit("table:listing", tables)
    })

    /*socket.on("table:created", () => {
        console.log("criando mesa")
        TableStore.create()
        const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
        io.emit("table:listing", tables)
    })*/
    socket.on("table:list", () => {
        const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
        socket.emit("table:listing", tables)
    })

    socket.on("table:join", ({ tableId, userId }) => {
        const table = TableStore.ensureTable(tableId)

        if (!table.isWaiting()) {
            socket.emit("table:error", { message: "Mesa já em andamento" })
            return
        }

        const players = table.getAllPlayers()
        console.log("Jogadores na mesa antes de jogador entrar: ", players)

        //if (players.length > 0) {
        //const hasPlayer = players.some(p => p.userId === userId)
        const hasPlayer = players.find(p => p.userId === userId)

        let isNewPlayer = false
        let isReconnect = false

        if (hasPlayer) {
            if (!hasPlayer.connected) {
                console.log("reconectando jogador", userId)
                table.reconnectPlayer(userId, socket.id)
                isReconnect = true
            } else {
                console.log("Jogador já está connectado", userId)
                hasPlayer.socketId = socket.id
            }
        } else {
            table.addPlayer({ userId, socketId: socket.id })
            console.log("jogador entrou na mesa", userId)
            isNewPlayer = true
        }

        socket.join(tableId)

        // envia estado apenas para quem entrou
        socket.emit("table:state", table.getPublicState(userId))

        if (isNewPlayer || isReconnect) {
            const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
            io.emit("table:listing", tables)
            socket.to(tableId).emit("table:playerJoined", table.getPublicState())
        }
        //io.emit("table:update", table.getPublicState())

        // avisa os outros jogadores
        /*if (isNewPlayer) {
            socket.to(tableId).emit("table:playerJoined", table.getPublicState())
        }*/
    })

    socket.on("table:leave", ({ tableId, userId }) => {
        const table = TableStore.getOnly(tableId)
        if (!table) return

        table.removePlayer(userId)
        socket.leave(tableId)

        io.to(tableId).emit("table:playerLeft", { userId })
    })


    socket.on("table:start-hand", async ({ tableId }) => {
        console.log("jogador iniciando mão", tableId)
        const table = TableStore.getOnly(tableId)
        if (!table) return

        if (!table.isWaiting()) return
        if (table.activePlayers().length < 2) return

        await table.startHand()

        io.to(tableId).emit("table:update", table.getPublicState())

        for (const p of table.getPlayersAbleToAct()) {
            if (!p.socketId) continue

            io.to(p.socketId).emit("player:hand", {
                hand: p.hand
            })
        }
    })

    socket.on("disconnect", () => {
        const tables = TableStore.findBySocket(socket.id)

        for (const table of tables) {
            table.markPlayerDisconnected(socket.id)
            io.to(table.id).emit("table:update", table.getPublicState())

        }
        const t = TableStore.getAllTables().map(tt => tt.getLobbyInfo())
        io.emit("table:listing", t)
    })
}
