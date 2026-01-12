//armazenamento em memoria ou Redis
import { Table } from "../game/Table"

class TableStoreClass {
    private tables: Map<string, Table> = new Map()

    // Busca ou cria uma table
    getOrCreate(tableId: string): Table {
        let table = this.tables.get(tableId)

        if (!table) {
            table = new Table(tableId)
            this.tables.set(tableId, table)
        }

        return table
    }
    getOnly(tableId: string) {
        const table = this.tables.get(tableId)
        if (!table) throw new Error("Table não encontrada")
        return table
    }

    remove(tableId: string): void {
        this.tables.delete(tableId)
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
            }
        }
    }
}

export const TableStore = new TableStoreClass()
