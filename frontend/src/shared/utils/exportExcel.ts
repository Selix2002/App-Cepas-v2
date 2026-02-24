// src/utils/exportGrid.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { GridApi } from 'ag-grid-community';

export async function exportToExcel(
  gridApi: GridApi,
  sheetName = 'Sheet1',
  fileName = 'data.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // ... (el resto del código para obtener columnas y cabeceras sigue igual)
  const allCols = gridApi.getAllGridColumns();
  const visibleCols = allCols.filter(col => col.isVisible());

  const fieldKeys = visibleCols.map(col => {
    const def = col.getColDef();
    return (def.field as string) ?? col.getColId();
  });
  const headers = visibleCols.map(col =>
    col.getColDef().headerName ?? col.getColId()
  );

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell({ includeEmpty: true }, cell => {
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // 4) Recopilar datos de filas (¡AQUÍ ESTÁ EL CAMBIO!)
  const rowData: any[] = [];
  // Se reemplaza forEachNode por forEachNodeAfterFilterAndSort
  gridApi.forEachNodeAfterFilterAndSort(node => {
    if (node.data) {
      rowData.push(node.data);
    }
  });

  // El resto de la función para ordenar, agregar filas y descargar sigue igual...
  // Asumiendo que cada fila tiene la propiedad 'id' en root
  rowData.sort((a, b) => {
    const idA = typeof a.id === 'number' ? a.id : parseFloat(a.id);
    const idB = typeof b.id === 'number' ? b.id : parseFloat(b.id);
    return (idA || 0) - (idB || 0);
  });
  
  rowData.forEach(data => {
    const row = fieldKeys.map(key => {
      const keys = key.split('.');
      let val: any = data;
      for (const k of keys) {
        if (val == null) break;
        val = val[k];
      }
      return val != null && typeof val === 'object'
        ? JSON.stringify(val)
        : val ?? '';
    });

    const rowObj = worksheet.addRow(row);
    rowObj.eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
  });

  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
}