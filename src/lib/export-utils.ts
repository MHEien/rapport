import * as XLSX from "xlsx";

/**
 * Trigger a browser download of a JSON file
 */
export function downloadAsJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download of an Excel file
 */
export function downloadAsExcel(
  data: any[],
  sheetName: string,
  filename: string,
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-width columns
  const keys = Object.keys(data[0] || {});
  const wscols = keys.map((key) => ({ wch: Math.max(key.length, 15) }));
  ws["!cols"] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(
    wb,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}
