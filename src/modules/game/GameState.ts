//maquina de estados

export type GamePhase =
    | "waiting"
    | "preflop"
    | "flop"
    | "turn"
    | "river"
    | "showdown"

export class GameState {
    private phase: GamePhase = "waiting"

    getPhase(): GamePhase {
        return this.phase
    }

    startHand() {
        this.phase = "preflop"
    }
    endHand() {
        this.phase = "waiting"
    }

    next() {
        if (this.phase === 'waiting') throw new Error("Não é possível avançar a partir de 'waiting'")

        switch (this.phase) {
            case "preflop":
                this.phase = "flop"
                break
            case "flop":
                this.phase = "turn"
                break
            case "turn":
                this.phase = "river"
                break
            case "river":
                this.phase = "showdown"
                break
            case "showdown":
                this.endHand()
                break
        }
    }

    isBettingPhase(): boolean {
        return (
            this.phase === "preflop" ||
            this.phase === "flop" ||
            this.phase === "turn" ||
            this.phase === "river"
        )
    }

    isShowdown(): boolean {
        return this.phase === "showdown"
    }
    isWaiting(): boolean {
        return this.phase === 'waiting'
    }

    reset() {
        this.phase = "waiting"
    }
}
