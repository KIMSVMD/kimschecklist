// Minimal .xlsx writer — one worksheet with styled cells, merged ranges, column widths and
// frozen panes — so an export can look like the sheet people already use (coloured cells,
// merged headers) instead of a bare CSV. No dependencies: an .xlsx is a zip of a few XML
// files, and the zip below uses the "stored" (uncompressed) method.

export type XlsxStyle = {
  bold?: boolean;
  size?: number;
  color?: string; // text colour, "RRGGBB"
  fill?: string; // background, "RRGGBB"
  border?: boolean; // thin black border on all sides
  align?: "left" | "center" | "right";
};

export type XlsxCell = { v?: string | number | null; s?: number };

export type XlsxSheet = {
  name: string;
  styles: XlsxStyle[]; // cell.s indexes into this; styles[0] is the default for unstyled cells
  rows: XlsxCell[][];
  merges?: string[]; // e.g. "A1:B2"
  colWidths?: number[];
  rowHeights?: Record<number, number>; // 1-based row -> points
  freeze?: { cols: number; rows: number };
};

const enc = new TextEncoder();

function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colName(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function stylesXml(styles: XlsxStyle[]): string {
  const fonts: string[] = [];
  const fills: string[] = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  const fontIdx = new Map<string, number>();
  const fillIdx = new Map<string, number>();
  const xfs = styles.map(st => {
    const fontKey = `${st.bold ? 1 : 0}|${st.size ?? 11}|${st.color ?? "000000"}`;
    if (!fontIdx.has(fontKey)) {
      fontIdx.set(fontKey, fonts.length);
      fonts.push(
        `<font>${st.bold ? "<b/>" : ""}<sz val="${st.size ?? 11}"/><color rgb="FF${st.color ?? "000000"}"/><name val="Malgun Gothic"/><family val="2"/></font>`,
      );
    }
    let fillId = 0;
    if (st.fill) {
      if (!fillIdx.has(st.fill)) {
        fillIdx.set(st.fill, fills.length);
        fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${st.fill}"/><bgColor indexed="64"/></patternFill></fill>`);
      }
      fillId = fillIdx.get(st.fill)!;
    }
    return (
      `<xf numFmtId="0" fontId="${fontIdx.get(fontKey)}" fillId="${fillId}" borderId="${st.border ? 1 : 0}" xfId="0" ` +
      `applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">` +
      `<alignment horizontal="${st.align ?? "center"}" vertical="center" wrapText="1"/></xf>`
    );
  });
  const side = (n: string) => `<${n} style="thin"><color rgb="FF000000"/></${n}>`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<fonts count="${fonts.length}">${fonts.join("")}</fonts>` +
    `<fills count="${fills.length}">${fills.join("")}</fills>` +
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>${side("left")}${side("right")}${side("top")}${side("bottom")}<diagonal/></border></borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>"
  );
}

function sheetXml(sheet: XlsxSheet): string {
  const cols = (sheet.colWidths ?? [])
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const rows = sheet.rows
    .map((row, r) => {
      const ht = sheet.rowHeights?.[r + 1];
      const cells = row
        .map((cell, c) => {
          const ref = `${colName(c)}${r + 1}`;
          const s = cell.s ?? 0;
          if (cell.v === null || cell.v === undefined || cell.v === "") return `<c r="${ref}" s="${s}"/>`;
          if (typeof cell.v === "number") return `<c r="${ref}" s="${s}"><v>${cell.v}</v></c>`;
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(cell.v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cells}</row>`;
    })
    .join("");
  const f = sheet.freeze;
  const pane = f
    ? `<pane xSplit="${f.cols}" ySplit="${f.rows}" topLeftCell="${colName(f.cols)}${f.rows + 1}" activePane="bottomRight" state="frozen"/>`
    : "";
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    (cols ? `<cols>${cols}</cols>` : "") +
    `<sheetData>${rows}</sheetData>${merges}` +
    '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    "</worksheet>"
  );
}

// ── zip (stored) ────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = (46 << 9) | (1 << 5) | 1; // 2026-01-01
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true); // UTF-8 names
    lh.setUint16(8, 0, true); // stored
    lh.setUint16(10, DOS_TIME, true);
    lh.setUint16(12, DOS_DATE, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, f.data.length, true);
    lh.setUint32(22, f.data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    local.push(new Uint8Array(lh.buffer), name, f.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, DOS_TIME, true);
    ch.setUint16(14, DOS_DATE, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, f.data.length, true);
    ch.setUint32(24, f.data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  const sheetName = esc(sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1");
  const files = [
    {
      name: "[Content_Types].xml",
      text:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      text:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      text:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        "</Relationships>",
    },
    { name: "xl/styles.xml", text: stylesXml(sheet.styles) },
    { name: "xl/worksheets/sheet1.xml", text: sheetXml(sheet) },
  ];
  return zipStore(files.map(f => ({ name: f.name, data: enc.encode(f.text) })));
}

export function downloadXlsx(sheet: XlsxSheet, filename: string) {
  const bytes = buildXlsx(sheet);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
