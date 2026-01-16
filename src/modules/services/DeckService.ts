//integração com o deckofcardsapi

import axios from 'axios'
import { Card, DrawCards } from '../../@types/DrawCards'
import { CommonResponse, NewPile } from '../../@types/mainDeckResponses'

export class DeckService {
    private url: string
    constructor() {
        const url = process.env.API_BASEURL
        if (!url) throw new Error("URL da api de cartas não definida corretamente nas variáveis de ambiente!")
        this.url = url
    }
    public async openNewDeck(): Promise<String> {
        const { data } = await axios.get<CommonResponse>(`${this.url}/new/`)
        return data.deck_id
    }
    public async createDeck(deckCount = 1): Promise<string> {
        const { data } = await axios.get<CommonResponse>(`${this.url}/new/shuffle/?deck_count=${deckCount}`)
        return data.deck_id
    }

    public async draw(deckId: string, count: number): Promise<Card[]> {
        const { data } = await axios.get<DrawCards>(`${this.url}/${deckId}/draw/?count=${count}`)
        return data.cards
    }

    public async reshuffleCards(deckId: string): Promise<CommonResponse> {
        const { data } = await axios.get<CommonResponse>(`${this.url}/${deckId}/shuffle/`, {
            params: { remaining: true }
        })
        return data
    }

    private async addToPile(deck_id: string, pile_name: string, cards: string[]): Promise<NewPile> {
        const { data } = await axios.get<NewPile>(`${this.url}/${deck_id}/pile/${pile_name}/add/`, {
            params: { cards }
        })
        return data
    }

    public async discardCards(deck_id: string, cards: string[]) {
        return await this.addToPile(deck_id, 'discard', cards)
    }

    public async addToPlayerHand(deck_id: string, user_id: string, cards: string[]) {
        return await this.addToPile(deck_id, user_id, cards)
    }

    public async getPlayerHand(deck_id: string, user_id: string) {
        const { data } = await axios.get<NewPile>(`${this.url}/${deck_id}/pile/${user_id}/list`)
        const pile = data.piles[user_id]

        if (!pile) {
            throw new Error("Mão do jogador inexistente")
        }
        return pile
    }

}
