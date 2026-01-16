import { Router } from 'express'
import axios from 'axios'
import { TableStore } from './modules/store/TableStore'
import { NewTableResponse } from './@types/newTable'

const rotas = Router()
const url = process.env.API_BASEURL



rotas.get('/online', (req, res) => {
    return res.status(200).json({ message: 'online' })
})

rotas.get("/new/table", async (req, res) => {

    if (!url) throw new Error("URL da api não definida nas variáveis de ambiente.")
    try {
        const { data } = await axios.get<NewTableResponse>(`${url}/new/shuffle/`)
        TableStore.create(data.deck_id)
        return res.status(201).json(data)
    } catch (err: any) {
        console.log("Erro ao abrir deck/criar table", err)
        return res.status(500).json(err.response?.data)
    }
})

rotas.get('/:id/draw', async (req, res) => {
    if (!url) throw new Error("URL da api não definida nas variáveis de ambiente.")
    const { amount } = req.query
    const { id } = req.params
    try {
        const { data } = await axios.get(`${url}/${id}/draw/`, {
            params: { count: Number(amount) }
        })
        return res.status(200).json(data)
    } catch (err: any) {
        console.log("Erro ao baixar cartas", err.response?.data)
        return res.status(500).json(err.response?.data)
    }
})

rotas.get('/tables', (req, res) => {
    const tables = TableStore.getAllTables().map(t => t.getLobbyInfo())
    console.log("tables em andamento: ", tables)
    return res.status(200).json(tables)
})

rotas.get('/socket/:id/tables', (req, res) => {
    const { id } = req.params;
    const tables = TableStore.findBySocket(id)
    return res.status(200).json(tables)
})

export { rotas }