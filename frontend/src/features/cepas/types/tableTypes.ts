// Reemplaza ColDef de ag-grid-community

export type CepaColumnDef = {
    field: string
    headerName: string
    width?: number
    pinned?: boolean          // true → primera columna frozen
    type?: "text" | "number" | "date"
}

export type SortConfig = {
    field: string
    dir: "asc" | "desc"
}

export type NotificationState = {
    text: string
    type: "success" | "error"
} | null

export type CoordFilter = {
    lat: number
    lng: number
}
