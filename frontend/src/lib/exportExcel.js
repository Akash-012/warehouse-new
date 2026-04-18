import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const WMS_BRAND_BLUE = 'FF1F5FCC';
const WMS_DEEP_BLUE = 'FF184EA8';
const WMS_SOFT_BLUE = 'FFEFF4FF';
const WMS_WHITE = 'FFFFFFFF';
const WMS_GRID = 'FFB7C9EA';

const WMS_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: WMS_BRAND_BLUE } };
const WMS_TITLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: WMS_SOFT_BLUE } };
const WMS_ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFF' } };

function fullBorder(color = WMS_GRID, style = 'thin') {
  return {
    top: { style, color: { argb: color } },
    left: { style, color: { argb: color } },
    bottom: { style, color: { argb: color } },
    right: { style, color: { argb: color } },
  };
}

function styleStatusCell(cell, value) {
  const text = String(value ?? '').toUpperCase();
  if (!text) return;

  const palette = {
    AVAILABLE: 'FFE8F7EE',
    RECEIVED: 'FFEFF6FF',
    IN_PUTAWAY: 'FFFFF7E6',
    RESERVED: 'FFFFF4E8',
    PICKED: 'FFEFF4FF',
    PACKED: 'FFEAFBF8',
    SHIPPED: 'FFE8FAF2',
    PENDING: 'FFFFF7E6',
    OPEN: 'FFEFF6FF',
    PARTIAL: 'FFFFF4E8',
    CANCELLED: 'FFFFEDEE',
    BLOCKED: 'FFFFEDEE',
    FULL: 'FFFFF4E8',
    HIGH: 'FFFFEDEE',
    MEDIUM: 'FFFFF4E8',
    LOW: 'FFEFF6FF',
  };

  const fill = palette[text];
  if (fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  }
}

export async function exportWmsWorkbook({ fileName, sheetName, title, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WMS Pro';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const totalCols = columns.length;

  worksheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 15, color: { argb: WMS_DEEP_BLUE } };
  titleCell.fill = WMS_TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.border = fullBorder('FFD8E4F7');

  worksheet.mergeCells(2, 1, 2, totalCols);
  const generatedCell = worksheet.getCell(2, 1);
  generatedCell.value = `Generated: ${new Date().toLocaleString()}`;
  generatedCell.font = { size: 10, color: { argb: 'FF5A6B87' } };
  generatedCell.fill = WMS_TITLE_FILL;
  generatedCell.alignment = { vertical: 'middle', horizontal: 'left' };
  generatedCell.border = fullBorder('FFD8E4F7');

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 20;

  const headerRow = worksheet.getRow(3);
  headerRow.height = 24;
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: WMS_WHITE }, size: 11 };
    cell.fill = WMS_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = fullBorder('FF9EB8E6');
    worksheet.getColumn(index + 1).width = col.width ?? 18;
  });

  rows.forEach((row) => {
    const values = columns.map((col) => {
      if (typeof col.value === 'function') return col.value(row);
      return row[col.key] ?? '';
    });
    worksheet.addRow(values);
  });

  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: totalCols },
  };

  for (let r = 4; r <= worksheet.rowCount; r += 1) {
    const row = worksheet.getRow(r);
    row.height = 21;
    const zebra = r % 2 === 0;

    for (let c = 1; c <= totalCols; c += 1) {
      const cell = row.getCell(c);
      const col = columns[c - 1];

      if (zebra) {
        cell.fill = WMS_ZEBRA_FILL;
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WMS_WHITE } };
      }

      if (col.align) {
        cell.alignment = { horizontal: col.align, vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      cell.border = fullBorder('FFD6E3F8');

      if (col.key && /(status|state|priority)/i.test(col.key)) {
        styleStatusCell(cell, cell.value);
        cell.font = { bold: true, color: { argb: 'FF20304A' } };
      }

      // Keep large text readable when users open on narrow screens or print.
      if (typeof cell.value === 'string' && cell.value.length > 45) {
        cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'top' };
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(csvText) {
  const lines = String(csvText ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return { headers: [], records: [] };

  const headers = parseCsvLine(lines[0]);
  const records = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? '';
    });
    return row;
  });

  return { headers, records };
}

export async function exportCsvEndpointAsWmsExcel({
  endpoint,
  fileName,
  sheetName,
  title,
}) {
  const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const apiBaseUrl = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/$/, '') : '';
  const requestUrl = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : apiBaseUrl
      ? `${apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      : endpoint;

  const response = await fetch(requestUrl, {
    headers: { Accept: 'text/csv,text/plain,*/*' },
  });

  if (!response.ok) {
    throw new Error(`Export request failed with status ${response.status}`);
  }

  const csvText = await response.text();
  const { headers, records } = parseCsvText(csvText);

  const columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, Math.min(34, header.length + 6)),
  }));

  await exportWmsWorkbook({
    fileName,
    sheetName,
    title,
    columns,
    rows: records,
  });
}
