import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { PDFParse } from "pdf-parse";

function extractNumber(str: string): number {
    if (!str) return 0;
    const normalized = str.replace(",", ".").replace(/[^\d.]/g, "");
    const num = Number.parseFloat(normalized);
    return Number.isNaN(num) ? 0 : Math.round(num);
}

interface ParsedPart {
    partNumber: string;
    description: string;
    quantity: number;
    unit: string;
}

function parsePdfText(text: string): ParsedPart[] {
    const parts: ParsedPart[] = [];
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
        // Skip header-like lines and known garbage patterns
        const lowerLine = line.toLowerCase();
        if (
            line.length < 5 ||
            /^\d{2}\.\d{2}\.\d{2}$/.test(line) ||
            /^(o|ve|p|st|ty|e)$/i.test(line) ||
            lowerLine.includes("part number") ||
            lowerLine.includes("description") ||
            lowerLine.includes("quantity") ||
            lowerLine.includes("artikkel") ||
            lowerLine.includes("antall") ||
            lowerLine.includes("bokføring") ||
            lowerLine.includes("varenr") ||
            lowerLine.includes("kladde") ||
            lowerLine.includes("lagerflytting") ||
            lowerLine.includes("sterner") ||
            lowerLine.includes("side") ||
            lowerLine.startsWith("service") ||
            /^bil\s/i.test(line) ||
            /^\d{1,2}:\d{2}:\d{2}/.test(line) ||
            /^--\s*\d+\s+of\s+\d+\s*--$/.test(line)
        ) {
            continue;
        }

        // Strategy 2: Tab-separated Vareoverføring format
        if (line.includes("\t")) {
            const segments = line.split("\t").map((s) => s.trim());

            if (segments.length >= 2 && /^\d{2}\.\d{2}\.\d{2}$/.test(segments[0])) {
                const varenrBeskrivelse = segments[1];
                const varenrMatch = varenrBeskrivelse.match(/^(\d{6,})\s+(.+)$/);

                if (varenrMatch) {
                    const varenr = varenrMatch[1];
                    const beskrivelse = varenrMatch[2].trim();

                    let antall = 0;
                    let enhetskode = "STK";

                    for (let i = segments.length - 1; i >= 2; i--) {
                        const antallMatch = segments[i].match(/^(\d+)\s+(\S+)$/);
                        if (antallMatch) {
                            antall = extractNumber(antallMatch[1]);
                            enhetskode = antallMatch[2];
                            break;
                        }
                    }

                    if (antall > 0 && varenr && beskrivelse) {
                        parts.push({
                            partNumber: varenr,
                            description: beskrivelse,
                            quantity: antall,
                            unit: enhetskode,
                        });
                    }
                }
            }
        }
    }

    return parts;
}

async function testParser() {
    const pdfPath = "Vareoverførings.kladd Fredrik.pdf";

    console.log("Testing parser with:", pdfPath);

    if (!fs.existsSync(pdfPath)) {
        console.error("❌ PDF not found at:", pdfPath);
        process.exit(1);
    }

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

    console.log("\n=== PARSED ITEMS ===\n");
    const items = parsePdfText(result.text);

    if (items.length === 0) {
        console.log("❌ No items parsed!");
    } else {
        console.log(`✅ Found ${items.length} items:\n`);
        items.forEach((item, i) => {
            console.log(`[${i + 1}] Varenr: ${item.partNumber}`);
            console.log(`    Beskrivelse: ${item.description}`);
            console.log(`    Antall: ${item.quantity} ${item.unit}`);
            console.log("");
        });
    }

    await parser.destroy();
}

testParser();
