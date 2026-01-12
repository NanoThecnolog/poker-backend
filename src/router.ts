import { Router } from 'express'
import axios from 'axios'

const rotas = Router()
const url = process.env.API_BASEURL

rotas.get('/online', (req, res) => {
    return res.status(200).json({ message: 'online' })
})

rotas.get("/new/deck", async (req, res) => {

    if (!url) throw new Error("URL da api não definida nas variáveis de ambiente.")
    try {
        const { data } = await axios.get(`${url}/new/shuffle/`)
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

export { rotas }