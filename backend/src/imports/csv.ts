/** Parser CSV mínimo: coma o punto y coma, comillas y BOM de Excel. */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const raw = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const first = parseLine(lines[0]);
  const delimiter = guessDelimiter(lines[0]);
  const headers = (delimiter === "," ? first : parseLine(lines[0], delimiter)).map(normalizeHeader);
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseLine(line, delimiter);
    if (cells.every((c) => !c.trim())) continue;
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

function guessDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

function parseLine(line: string, delimiter: "," | ";" = ","): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function pick(row: CsvRow, ...aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key]) return row[key];
  }
  return "";
}
