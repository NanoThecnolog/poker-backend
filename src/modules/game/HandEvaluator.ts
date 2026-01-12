//avaliação de mãos

const RANKS = "23456789TJQKA"

type HandRank =
    | "HIGH_CARD"
    | "ONE_PAIR"
    | "TWO_PAIR"
    | "THREE_OF_A_KIND"
    | "STRAIGHT"
    | "FLUSH"
    | "FULL_HOUSE"
    | "FOUR_OF_A_KIND"
    | "STRAIGHT_FLUSH"
    | "ROYAL_FLUSH"

type EvaluatedHand = {
    rank: HandRank
    value: number
}

function rankValue(rank: HandRank): number {
    return [
        "HIGH_CARD",
        "ONE_PAIR",
        "TWO_PAIR",
        "THREE_OF_A_KIND",
        "STRAIGHT",
        "FLUSH",
        "FULL_HOUSE",
        "FOUR_OF_A_KIND",
        "STRAIGHT_FLUSH",
        "ROYAL_FLUSH"
    ].indexOf(rank)
}

function parse(cards: string[]) {
    return cards.map((c) => ({
        rank: c[0],
        suit: c[1],
        value: RANKS.indexOf(c[0])
    }))
}

export class HandEvaluator {
    static evaluate(cards: string[]): EvaluatedHand {
        const parsed = parse(cards)

        const byRank = new Map<number, number>()
        const bySuit = new Map<string, number[]>()

        for (const c of parsed) {
            byRank.set(c.value, (byRank.get(c.value) ?? 0) + 1)
            bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.value])
        }

        const ranks = Array.from(byRank.entries()).sort((a, b) => b[0] - a[0])
        const isFlush = Array.from(bySuit.values()).some((v) => v.length >= 5)

        const values = Array.from(new Set(parsed.map(c => c.value))).sort((a, b) => b - a)

        const isStraight =
            values.some((v, i) =>
                values.slice(i, i + 5).every((n, idx) => n === v - idx)
            ) ||
            values.includes(12) && [0, 1, 2, 3, 4].every(v => values.includes(v))

        if (isFlush && isStraight && values.includes(12)) {
            return { rank: "ROYAL_FLUSH", value: rankValue("ROYAL_FLUSH") }
        }

        if (isFlush && isStraight) {
            return { rank: "STRAIGHT_FLUSH", value: rankValue("STRAIGHT_FLUSH") }
        }

        if (ranks[0][1] === 4) {
            return { rank: "FOUR_OF_A_KIND", value: rankValue("FOUR_OF_A_KIND") }
        }

        if (ranks[0][1] === 3 && ranks[1]?.[1] === 2) {
            return { rank: "FULL_HOUSE", value: rankValue("FULL_HOUSE") }
        }

        if (isFlush) {
            return { rank: "FLUSH", value: rankValue("FLUSH") }
        }

        if (isStraight) {
            return { rank: "STRAIGHT", value: rankValue("STRAIGHT") }
        }

        if (ranks[0][1] === 3) {
            return { rank: "THREE_OF_A_KIND", value: rankValue("THREE_OF_A_KIND") }
        }

        if (ranks[0][1] === 2 && ranks[1]?.[1] === 2) {
            return { rank: "TWO_PAIR", value: rankValue("TWO_PAIR") }
        }

        if (ranks[0][1] === 2) {
            return { rank: "ONE_PAIR", value: rankValue("ONE_PAIR") }
        }

        return { rank: "HIGH_CARD", value: rankValue("HIGH_CARD") }
    }
}
