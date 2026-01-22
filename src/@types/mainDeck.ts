export type Suit = "H" | "D" | "C" | "S"
export type Rank = | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
    | "0" | "J" | "Q" | "K" | "A"

export interface Card {
    suit: Suit
    rank: Rank
    code: `${Rank}${Suit}`,
}