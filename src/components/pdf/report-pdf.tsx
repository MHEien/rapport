/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// Types from Prisma (Mocked or imported from your actual path)
// Ensure these match your actual import paths
import type {
  ChecklistResult,
  Media,
  Report,
  ReportEquipment,
  ReportPart,
} from "@/app/generated/prisma/client";

// Define the shape of data we expect
type EquipmentWithChecklists = ReportEquipment & {
  checklists: (Omit<ChecklistResult, "status"> & {
    status: ChecklistResult["status"] | null;
    photos: Media[];
  })[];
};

export interface ReportPDFData extends Report {
  author: {
    name: string | null;
    email: string;
  };
  equipment: EquipmentWithChecklists[];
  parts?: ReportPart[]; // Consumed parts from van inventory
}

// Styles matching the "Sterner" PDF layout
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 80, // Space for Header
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 80, // Space for Footer
    color: "#000000",
    lineHeight: 1.2,
  },
  // Header Section
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  logoPlaceholder: {
    width: 100,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "right",
    marginBottom: 10,
    color: "#002E5D", // Sterner Blue
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#002E5D",
    paddingBottom: 10,
    marginBottom: 20,
  },
  metaCol: {
    width: "33%", // 3 columns layout
    marginBottom: 5,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 1,
    color: "#666",
  },
  metaValue: {
    fontSize: 10,
    color: "#000",
  },

  // Table Styles
  tableContainer: {
    width: "100%",
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#002E5D",
    backgroundColor: "#002E5D", // Sterner Blue background
    alignItems: "center",
    minHeight: 20,
    marginTop: 10,
    marginBottom: 10,
    color: "#FFF", // White text
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    minHeight: 18,
    alignItems: "center",
    paddingVertical: 2,
    wrap: false, // Keep each row together on same page
  },
  sectionHeader: {
    flexDirection: "row",
    backgroundColor: "#F0F7FF", // Very light blue tint
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 15,
    minHeight: 24,
    borderBottomWidth: 1,
    borderColor: "#B0D4F1",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 10,
    color: "#002E5D",
  },

  // Column Widths - Tuned to match PDF
  colNr: { width: "5%", paddingLeft: 2 },
  colDesc: { width: "35%", paddingRight: 5 },
  colCheck: {
    width: "8%",
    textAlign: "center",
    borderLeftWidth: 1,
    borderColor: "#eee",
  }, // Avvik, OK, N/A
  colValue: {
    width: "12%",
    textAlign: "center",
    borderLeftWidth: 1,
    borderColor: "#eee",
  },
  colComment: {
    width: "24%",
    paddingLeft: 5,
    borderLeftWidth: 1,
    borderColor: "#eee",
    fontSize: 8,
  },

  boldText: { fontWeight: "bold" },

  // Footer / Notes
  noteSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: "#000",
    paddingTop: 10,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    textDecoration: "underline",
  },
  noteText: {
    fontSize: 10,
    marginBottom: 3,
  },

  // Footer Styles - Critical for positioning
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    height: 50,
    borderTopWidth: 1,
    borderTopColor: "#002E5D",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: 7,
    color: "#666",
    backgroundColor: "#ffffff",
  },
  footerCol: {
    flexDirection: "column",
    flex: 1,
    maxWidth: 85,
  },
});

export const ReportPDF = ({ report }: { report: ReportPDFData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* 
          CRITICAL: In @react-pdf/renderer, fixed elements must be declared
          BEFORE flowing content to appear on ALL pages. The order in JSX matters!
          
          1. Fixed Footer (MUST BE FIRST for multi-page support)
          2. Fixed Header 
          3. Flowing Content
        */}

        {/* --- Fixed Footer (MUST come first for all pages) --- */}
        <View style={styles.footer} fixed>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: "bold", color: "#002E5D" }}>
              Hovedkontor
            </Text>
            <Text>Sterner AS</Text>
            <Text>Anolitveien 16</Text>
            <Text>1400 Ski</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: "bold", color: "#002E5D" }}>Bergen</Text>
            <Text>Sandslimarka 63</Text>
            <Text>5254 Sandsli</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: "bold", color: "#002E5D" }}>
              Porsgrunn
            </Text>
            <Text>Vipevegen 51</Text>
            <Text>3917 Porsgrunn</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: "bold", color: "#002E5D" }}>
              Lofoten
            </Text>
            <Text>Lufthavnveien 16</Text>
            <Text>8370 Leknes</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: "bold", color: "#002E5D" }}>
              Kontakt
            </Text>
            <Text>Tlf: 64 85 94 20</Text>
            <Text>post@sterneras.no</Text>
            <Text>www.sterneras.no</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text
          fixed
          render={({ pageNumber, totalPages }) =>
            `Side ${pageNumber} av ${totalPages}`
          }
          style={{
            position: "absolute",
            fontSize: 8,
            bottom: 20,
            right: 30,
            color: "#666",
          }}
        />

        {/* --- Fixed Header --- */}
        <View style={styles.headerContainer} fixed>
          <View style={styles.logoPlaceholder}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image
              src="/sterner-logo.png"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>SERVICERAPPORT</Text>
          </View>
        </View>

        {/* --- Main Content --- */}

        {/* Date/Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Kunde:</Text>
            <Text style={styles.metaValue}>{report.customerName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>SO-nummer:</Text>
            <Text style={styles.metaValue}>{report.soNumber || "-"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Dato:</Text>
            <Text style={styles.metaValue}>
              {format(new Date(report.serviceDate), "dd.MM.yyyy")}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Kontaktperson:</Text>
            <Text style={styles.metaValue}>{report.contactPerson || "-"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Tekniker:</Text>
            <Text style={styles.metaValue}>{report.author.name}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Epost:</Text>
            <Text style={styles.metaValue}>{report.author.email}</Text>
          </View>
        </View>

        {/* Equipment Loop */}
        {report.equipment.map((eq, index) => {
          const groupedChecklists = eq.checklists.reduce(
            (acc, item) => {
              const cat = item.category || "Generelt";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            },
            {} as Record<string, typeof eq.checklists>,
          );

          const categories = Array.from(
            new Set(eq.checklists.map((c) => c.category || "Generelt")),
          );

          return (
            <View key={eq.id} style={styles.tableContainer} break={index > 0}>
              <View
                style={[
                  styles.sectionHeader,
                  { backgroundColor: "#ccc", marginTop: 15, marginBottom: 8 },
                ]}
              >
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>
                  {eq.productType}: {eq.productName} (
                  {eq.serialNumber || "No SN"})
                  {eq.runningHours ? ` — ${eq.runningHours} timer` : ""}
                </Text>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.colNr, styles.boldText]}>Nr</Text>
                <Text style={[styles.colDesc, styles.boldText]}>
                  Servicepunkt
                </Text>
                <Text style={[styles.colCheck, styles.boldText]}>Avvik</Text>
                <Text style={[styles.colCheck, styles.boldText]}>OK</Text>
                <Text style={[styles.colCheck, styles.boldText]}>N/A</Text>
                <Text style={[styles.colValue, styles.boldText]}>Verdi</Text>
                <Text style={[styles.colComment, styles.boldText]}>
                  Kommentar
                </Text>
              </View>

              {categories.map((category) => (
                <View key={category}>
                  <View style={styles.sectionHeader} minPresenceAhead={60}>
                    <Text style={styles.sectionTitle}>{category}</Text>
                  </View>

                  {groupedChecklists[category].map((item, idx) => {
                    const isOK = item.status === "OK";
                    const isAvvik =
                      item.status === "BOR_UTBEDRES" ||
                      item.status === "MA_UTBEDRES";
                    const isNA = item.status === "IKKE_AKTUELT";

                    return (
                      <View
                        key={item.id}
                        style={{
                          ...styles.tableRow,
                          ...(idx % 2 === 0
                            ? { backgroundColor: "#F5F5F5" }
                            : {}),
                        }}
                        minPresenceAhead={50}
                      >
                        <Text style={styles.colNr}>{idx + 1}</Text>
                        <Text style={styles.colDesc}>{item.question}</Text>
                        <Text style={styles.colCheck}>
                          {isAvvik ? "X" : ""}
                        </Text>
                        <Text style={styles.colCheck}>{isOK ? "X" : ""}</Text>
                        <Text style={styles.colCheck}>{isNA ? "X" : ""}</Text>
                        <Text style={styles.colValue}>{item.value || "-"}</Text>
                        <Text style={styles.colComment}>
                          {item.comment || ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        {/* Parts Section */}
        {report.parts && report.parts.length > 0 && (
          <View style={styles.tableContainer}>
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: "#E8F5E9", marginTop: 15, marginBottom: 8 },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { fontSize: 12, color: "#2E7D32" },
                ]}
              >
                Deler brukt
              </Text>
            </View>

            <View style={[styles.tableHeader, { backgroundColor: "#2E7D32" }]}>
              <Text style={[{ width: "25%", paddingLeft: 5 }, styles.boldText]}>
                Artikkelnr.
              </Text>
              <Text style={[{ width: "45%", paddingLeft: 5 }, styles.boldText]}>
                Beskrivelse
              </Text>
              <Text
                style={[{ width: "15%", textAlign: "center" }, styles.boldText]}
              >
                Antall
              </Text>
              <Text
                style={[{ width: "15%", textAlign: "center" }, styles.boldText]}
              >
                Enhet
              </Text>
            </View>

            {report.parts.map((part) => (
              <View key={part.id} style={styles.tableRow}>
                <Text style={{ width: "25%", paddingLeft: 5, fontSize: 8 }}>
                  {part.partNumber}
                </Text>
                <Text style={{ width: "45%", paddingLeft: 5 }}>
                  {part.description}
                </Text>
                <Text style={{ width: "15%", textAlign: "center" }}>
                  {part.quantity}
                </Text>
                <Text
                  style={{ width: "15%", textAlign: "center", fontSize: 8 }}
                >
                  {part.unit || "stk"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Conclusion section - always start on a new page to avoid awkward placement */}
        <View break>
          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>
              Konklusjon/Notater (Felles for alle enheter):
            </Text>
            <Text style={styles.noteText}>
              {report.overallComment || "Ingen kommentarer."}
            </Text>
          </View>

          <View
            style={[styles.metaGrid, { borderBottomWidth: 0, marginTop: 40 }]}
          >
            <View style={{ width: "50%" }}>
              <Text style={styles.metaLabel}>Utført av:</Text>
              <Text style={styles.metaValue}>{report.author.name}</Text>
            </View>
            {report.signatureUrl && (
              <View style={{ width: "50%" }}>
                <Text style={styles.metaLabel}>Montør signatur:</Text>
                <Image
                  src={report.signatureUrl}
                  style={{ width: 120, height: 60, objectFit: "contain" }}
                />
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
