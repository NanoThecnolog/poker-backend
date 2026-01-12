//eventos da mesa

import { Server, Socket } from "socket.io"
import { TableStore } from "../store/TableStore"

export function registerTableHandlers(io: Server, socket: Socket) {
    socket.on("table:join", ({ tableId, userId }) => {
        const table = TableStore.getOrCreate(tableId)

        table.addPlayer({
            userId,
            socketId: socket.id
        })

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


    socket.on("disconnect", () => {
        const tables = TableStore.findBySocket(socket.id)

        for (const table of tables) {
            table.markPlayerDisconnected(socket.id)
            io.to(table.id).emit("table:update", table.getPublicState())
        }
    })

}
