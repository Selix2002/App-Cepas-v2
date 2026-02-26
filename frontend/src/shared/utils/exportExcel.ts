import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import type { GridApi } from "ag-grid-community"

const FILTER_ROW_ID = "__filter__"

export async function exportToExcel(
  gridApi: GridApi,
  sheetName = "Sheet1",
  fileName = "data.xlsx"
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  // getColumns() en lugar de getAllGridColumns() — compatible con Community
  const visibleCols = (gridApi.getColumns() ?? []).filter((col) => col.isVisible())

  const fieldKeys = visibleCols.map((col) => {
    const def = col.getColDef()
    return (def.field as string) ?? col.getColId()
  })

  const headers = visibleCols.map(
    (col) => col.getColDef().headerName ?? col.getColId()
  )

  // Cabecera
  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true }
    cell.border = {
      top:    { style: "thin", color: { argb: "FF000000" } },
      left:   { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right:  { style: "thin", color: { argb: "FF000000" } },
    }
  })

  // Filas — respeta filtros y orden actual, excluye fila __filter__
  const rowData: Record<string, unknown>[] = []
  gridApi.forEachNodeAfterFilterAndSort((node) => {
    if (node.data && node.data.id !== FILTER_ROW_ID) {
      rowData.push(node.data)
    }
  })

  rowData.forEach((data) => {
    const row = fieldKeys.map((key) => {
      const val = data[key]
      if (val === null || val === undefined) return ""
      if (typeof val === "object") return JSON.stringify(val)
      return val
    })

    const rowObj = worksheet.addRow(row)
    rowObj.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top:    { style: "thin", color: { argb: "FF000000" } },
        left:   { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right:  { style: "thin", color: { argb: "FF000000" } },
      }
    })
  })

  // Autoajustar ancho
  worksheet.columns.forEach((column) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0
      maxLength = Math.max(maxLength, len)
    })
    column.width = maxLength + 2
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName)
}