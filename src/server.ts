import dotenv from 'dotenv'
dotenv.config()
import { createServer } from 'http';
import { Server } from 'socket.io'
import express, { NextFunction, Request, Response } from 'express'
import { rotas } from './router';


const app = express()
app.use(express.json())
app.use(rotas)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Erro interno do servidor..' });
});

const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5252',
        methods: ["GET", "POST"]
    }
})

io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) return next(new Error("Unauthorized"))

    next()
})

io.on('connection', (socket) => {
    console.log("Cliente conectado", socket.id)

    socket.on('disconnect', () => {
        console.log("Cliente desconectado", socket.id)
    })
})

const port = process.env.PORT;
if (!port) {
    console.error("Variavel de ambiente port não definida corretamente.")
}

httpServer.listen(port, () => {
    console.log("Socket rodando na porta", port)
})

