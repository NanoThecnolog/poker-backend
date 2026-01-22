import { Player } from "../modules/game/Player"

export interface NewTableResponse {
    deck_id: string,
    remaining: number,
    shuffled: boolean,
    success: boolean
}

export interface TableConfig {
    minRaise?: number
    currentBet?: number

}