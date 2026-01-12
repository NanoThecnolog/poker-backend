//integração com o deckofcardsapi

import axios from 'axios'
import { OpenNewDeck } from '../../@types/OpenNewDeck'
import { Card, DrawCards } from '../../@types/DrawCards'

export class DeckService {
    private url: string
    constructor() {
        const url = process.env.API_BASEURL
        if (!url) throw new Error("URL da api de cartas não definida corretamente nas variáveis de ambiente!")
        this.url = url
    }
    public async createDeck(deckCount = 1): Promise<string> {
        const { data } = await axios.get<OpenNewDeck>(`${this.url}/new/shuffle/?deck_count=${deckCount}`)
        return data.deck_id
    }

    public async draw(deckId: string, count: number): Promise<Card[]> {
        const { data } = await axios.get<DrawCards>(`${this.url}/${deckId}/draw/?count=${count}`)
        return data.cards
    }
}
