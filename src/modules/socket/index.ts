import { Server } from "socket.io";
import { registerTableHandlers } from "./table.handlers";
import { registerPlayerHandlers } from "./player.handlers";

export const registerSocketHandlers = (io: Server) => {
    io.on('connection', (socket) => {
        console.log("Socket conectado", socket.id)
        registerTableHandlers(io, socket)
        registerPlayerHandlers(io, socket)
    })
}