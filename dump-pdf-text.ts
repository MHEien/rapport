import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { PDFParse } from "pdf-parse";

async function dumpPdfText() {
  const pdfPath = "Vareoverførings.kladd Fredrik.pdf";

  console.log("Reading PDF:", pdfPath);

  if (!fs.existsSync(pdfPath)) {
    console.error("❌ PDF not found at:", pdfPath);
    process.exit(1);
  }

  // Set worker path
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "worker",
    "pdf.worker.mjs",
  );
  PDFParse.setWorker(pathToFileURL(workerPath).href);

  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  console.log("\n=== RAW PDF TEXT ===\n");
  console.log(result.text);
  console.log("\n=== END OF PDF TEXT ===\n");

  // Show each line separately for analysis
  console.log("\n=== LINE BY LINE ANALYSIS ===\n");
  const lines = result.text
    .split("\n")
    .map((l, i) => `[${i.toString().padStart(3)}] "${l}"`);
  console.log(lines.join("\n"));

  await parser.destroy();
}

dumpPdfText();
