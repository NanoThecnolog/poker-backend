import { Server } from "socket.io";
import { registerTableHandlers } from "./table.handlers";
import { registerPlayerHandlers } from "./player.handlers";

export const registerSocketHandlers = (io: Server) => {
    io.on('connection', (socket) => {
        registerTableHandlers(io, socket)
        registerPlayerHandlers(io, socket)
    })
}