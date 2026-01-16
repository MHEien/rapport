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

// Types from Prisma
import type {
  ChecklistResult,
  Media,
  Report,
  ReportEquipment,
} from "@/app/generated/prisma/client";

// Define the shape of data we expect
type EquipmentWithChecklists = ReportEquipment & {
  checklists: (ChecklistResult & {
    photos: Media[];
  })[];
};

export interface ReportPDFData extends Report {
  author: {
    name: string | null;
    email: string;
  };
  equipment: EquipmentWithChecklists[];
}

// Styles matching the "Sterner" PDF layout
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9, // Slightly smaller to fit table data
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 30,
    color: "#000000",
    lineHeight: 1.2,
  },
  // Header Section [cite: 1-9]
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  logoPlaceholder: {
    width: 100,
    height: 40,
    backgroundColor: "#EEE", // Placeholder for Sterner logo
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "right",
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
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
  },
  metaValue: {
    fontSize: 10,
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
    borderColor: "#000",
    backgroundColor: "#f3f3f3",
    alignItems: "center",
    minHeight: 20,
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    minHeight: 18,
    alignItems: "center",
    paddingVertical: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    backgroundColor: "#e6e6e6",
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: 8,
    borderBottomWidth: 1,
    borderColor: "#999",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 10,
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

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  photoContainer: {
    width: "30%",
    marginBottom: 10,
  },
  photo: {
    width: "100%",
    height: 100,
    objectFit: "cover",
    backgroundColor: "#eee",
  },
});

export const ReportPDF = ({ report }: { report: ReportPDFData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --- Header Section  --- */}
        <View style={styles.headerContainer}>
          {/* Replace with actual Logo Image if available */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>STERNER</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>KONSOLIDERT SERVICERAPPORT</Text>
          </View>
        </View>

        {/* --- Meta Data Grid  --- */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Kunde:</Text>
            <Text style={styles.metaValue}>{report.customerName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>SO:</Text>
            <Text style={styles.metaValue}>{report.reportNumber}</Text>
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

        {/* --- Equipment Loop --- */}
        {report.equipment.map((eq, _index) => {
          // Group checklists by category (e.g., "Visuell Kontroll", "Lampebytte")
          const groupedChecklists = eq.checklists.reduce(
            (acc, item) => {
              const cat = item.category || "Generelt";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            },
            {} as Record<string, typeof eq.checklists>,
          );

          const categories = Object.keys(groupedChecklists).sort();

          return (
            <View key={eq.id} wrap={false} style={styles.tableContainer}>
              {/* Equipment Header acting as main section */}
              <View
                style={[
                  styles.sectionHeader,
                  { backgroundColor: "#ccc", marginTop: 15 },
                ]}
              >
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>
                  {eq.productType}: {eq.productName} (
                  {eq.serialNumber || "No SN"})
                </Text>
              </View>

              {/* Table Column Headers  */}
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

              {/* Categories and Rows */}
              {categories.map((category) => (
                <View key={category}>
                  {/* Sub-header for Category (e.g., Visuell Kontroll) */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{category}</Text>
                  </View>

                  {groupedChecklists[category].map((item, idx) => {
                    // Logic to place "X" in correct column
                    const isOK = item.status === "OK";
                    const isAvvik =
                      item.status === "BOR_UTBEDRES" ||
                      item.status === "MA_UTBEDRES";
                    const isNA = item.status === "IKKE_AKTUELT";

                    return (
                      <View key={item.id} style={styles.tableRow}>
                        <Text style={styles.colNr}>{idx + 1}</Text>
                        <Text style={styles.colDesc}>{item.question}</Text>

                        {/* Status Columns  */}
                        <Text style={styles.colCheck}>
                          {isAvvik ? "X" : ""}
                        </Text>
                        <Text style={styles.colCheck}>{isOK ? "X" : ""}</Text>
                        <Text style={styles.colCheck}>{isNA ? "X" : ""}</Text>

                        {/* Value Column (Placeholder logic, adapt if you have a value field) */}
                        <Text style={styles.colValue}>-</Text>

                        {/* Comment Column */}
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

        {/* --- Conclusion / Notes Section  --- */}
        <View style={styles.noteSection} break={false}>
          <Text style={styles.noteTitle}>
            Konklusjon/Notater (Felles for alle enheter):
          </Text>
          {/* Using summary or conclusion from report object if available */}
          <Text style={styles.noteText}>
            {/* If you have a general report comment field, put it here. 
                 Otherwise, listing specific critical comments is a good fallback. */}
            See comments in table above.
          </Text>
        </View>

        {/* --- Signatures --- */}
        <View
          style={[styles.metaGrid, { borderBottomWidth: 0, marginTop: 40 }]}
          break={false}
        >
          <View style={{ width: "50%" }}>
            <Text style={styles.metaLabel}>Utført av:</Text>
            <Text style={styles.metaValue}>{report.author.name}</Text>
          </View>
          {report.signatureUrl && (
            <View style={{ width: "50%" }}>
              <Text style={styles.metaLabel}>Kunde signatur:</Text>
              <Image
                src={report.signatureUrl}
                style={{ width: 120, height: 60, objectFit: "contain" }}
              />
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};
