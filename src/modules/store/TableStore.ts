//armazenamento em memoria ou Redis
import { nanoid } from "nanoid"
import { Table } from "../game/Table"
import { emit } from "../socket/wrappers/io"

class TableStoreClass {
    private tables: Map<string, Table> = new Map()

    // Cria uma table
    create(): Table {
        const id = nanoid()
        if (!id) throw new Error("Erro ao gerar id da mesa")
        const table = new Table(id)
        this.tables.set(id, table)
        emit("table:created", table.getLobbyInfo())
        console.log("table criada")
        return table
    }
    /*getOrCreate(tableId: string): Table {
        let table = this.tables.get(tableId)

        if (!table) {
            table = new Table(tableId)
            this.tables.set(tableId, table)
            console.log("table criada")
        }
        console.log("table criada")

        return table
    }*/
    ensureTable(id: string): Table {
        const table = this.tables.get(id)
        if (!table) return this.create()
        return table

    }
    getOnly(tableId: string): Table {
        const table = this.tables.get(tableId)
        if (!table) throw new Error("Table não encontrada")
        return table
    }
    getAllTables(): Table[] {
        return [...this.tables.values()]
    }

    remove(tableId: string): void {
        this.tables.delete(tableId)
        emit("table:removed", { tableId })
    }

    findBySocket(socketId: string): Table[] {
        const result: Table[] = []

        for (const table of this.tables.values()) {
            if (table.hasSocket(socketId)) {
                result.push(table)
            }
        }

        return result
    }

    cleanupEmptyTables(): void {
        for (const [id, table] of this.tables.entries()) {
            if (table.isEmpty()) {
                this.tables.delete(id)
                emit("table:removed", { tableId: id })
            }
        }
    }
}

export const TableStore = new TableStoreClass()
