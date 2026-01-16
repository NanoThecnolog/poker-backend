import { Server } from "socket.io";

let io: Server | null = null

export const setIO = (s: Server) => {
    io = s
}

export const emit = (e: string, payload: any) => {
    if (!io) return
    io.emit(e, payload)
}