import { nanoid } from "nanoid"
import { Card, Rank, Suit } from "../../@types/mainDeck"

export class Deck {
    private cards: Card[] = []
    id: string

    constructor() {
        this.cards = this.buildDeck()
        this.shuffle()
        this.id = nanoid()
    }

    private buildDeck(): Card[] {
        const suits: Suit[] = ["H", "D", "C", "S"]
        const ranks: Rank[] = [
            "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K", "A"
        ]


        return suits.flatMap(s =>
            ranks.map(r => ({
                suit: s,
                rank: r,
                code: `${r}${s}` as const,
            }))
        )
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
        }
    }

    draw(n = 1): Card[] {
        if (this.cards.length < n) throw new Error("Sem cartas no baralho")

        return this.cards.splice(0, n)
    }

    remaining() {
        return this.cards.length
    }
    backImage() {
        return "https://deckofcardsapi.com/static/img/back.png"
    }
}