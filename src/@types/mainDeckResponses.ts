export interface CommonResponse {
    success: boolean,
    deck_id: string,
    shuffled: boolean,
    remaining: number
}

export interface NewPile {
    success: boolean,
    deck_id: string,
    remaining: number,
    piles: Piles
}

export interface ListPiles {

}

export interface Pile {
    remaining: number,
    cards?: Card[]
}

export interface Card {
    image: string,
    value: string,
    suit: string,
    code: string
}

export type Piles = Record<string, Pile>