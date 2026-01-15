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
import { nb } from "date-fns/locale";

// Types from Prisma (loosely defined to avoid circular deps if possible, or correct imports)
import type {
  ChecklistResult,
  Media,
  Report,
} from "@/app/generated/prisma/client";

// Define the shape of data we expect
export interface ReportPDFData extends Report {
  author: {
    name: string | null;
    email: string;
  };
  checklists: (ChecklistResult & {
    photos: Media[];
  })[];
}

// Register fonts if needed (using default Helvetica for now which is robust)

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 30,
    color: "#0f172a", // Slate 900
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1", // Slate 300
    paddingBottom: 10,
  },
  logoObj: {
    width: 120,
    height: 40,
    backgroundColor: "#0f172a", // Placeholder for now
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 10,
    color: "#64748b", // Slate 500
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#334155", // Slate 700
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  col2: {
    width: "50%",
    paddingRight: 10,
  },
  label: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 11,
    fontWeight: "medium",
    marginBottom: 8,
  },
  // Checklist Styles
  categoryHeader: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "#f1f5f9", // Slate 100
    padding: 6,
    color: "#334155",
  },
  checklistItem: {
    flexDirection: "row",
    marginBottom: 9,
    alignItems: "flex-start",
    paddingBottom: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  statusBadge: {
    width: 70,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "white",
  },
  questionText: {
    flex: 1,
    fontSize: 10,
  },
  commentText: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
    fontStyle: "italic",
  },
  // Status Colors
  statusOK: { backgroundColor: "#10b981" },
  statusSHOULD_FIX: { backgroundColor: "#f59e0b" },
  statusMUST_FIX: { backgroundColor: "#ef4444" },
  statusNA: { backgroundColor: "#94a3b8" },

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  photoContainer: {
    width: "48%", // 2 per row roughly
    marginBottom: 10,
  },
  photo: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});

const StatusBadge = ({ status }: { status: string }) => {
  let style = styles.statusNA;
  let text = "N/A";

  switch (status) {
    case "OK":
      style = styles.statusOK;
      text = "OK";
      break;
    case "SHOULD_FIX":
      style = styles.statusSHOULD_FIX;
      text = "Bør fikses";
      break;
    case "MUST_FIX":
      style = styles.statusMUST_FIX;
      text = "Må fikses";
      break;
  }

  return (
    <View style={[styles.statusBadge, style]}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
};

export const ReportPDF = ({ report }: { report: ReportPDFData }) => {
  // Group checklist items by category
  const groupedChecklists = report.checklists.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof report.checklists>,
  );

  const categories = Object.keys(groupedChecklists).sort();
  const photos = report.checklists.flatMap((item) =>
    item.photos.map((p) => ({
      ...p,
      caption: `${item.category} - ${item.question}`,
    })),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.reportTitle}>RAPPORT</Text>
            <Text style={styles.reportDate}>
              #{report.reportNumber} •{" "}
              {format(new Date(report.createdAt), "d. MMMM yyyy", {
                locale: nb,
              })}
            </Text>
          </View>
          <View style={styles.logoObj}>
            <Text style={styles.logoText}>LOGO</Text>
          </View>
        </View>

        {/* Customer & Equipment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Oppdragsinformasjon</Text>
          <View style={styles.grid}>
            <View style={styles.col2}>
              <Text style={styles.label}>Kunde</Text>
              <Text style={styles.value}>{report.customerName}</Text>

              <Text style={styles.label}>Adresse</Text>
              <Text style={styles.value}>{report.customerAddress || "—"}</Text>

              <Text style={styles.label}>Kontaktperson</Text>
              <Text style={styles.value}>{report.contactPerson || "—"}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Utstyr / Produkt</Text>
              <Text style={styles.value}>{report.productName}</Text>

              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{report.productType || "—"}</Text>

              <Text style={styles.label}>Serienummer</Text>
              <Text style={styles.value}>{report.serialNumber || "—"}</Text>

              <Text style={styles.label}>Timeteller</Text>
              <Text style={styles.value}>
                {report.runningHours ? `${report.runningHours}t` : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sjekkliste</Text>
          {categories.map((category) => (
            <View key={category} wrap={false}>
              <Text style={styles.categoryHeader}>{category}</Text>
              {groupedChecklists[category].map((item) => (
                <View key={item.id} style={styles.checklistItem}>
                  <StatusBadge status={item.status} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questionText}>{item.question}</Text>
                    {item.comment && (
                      <Text style={styles.commentText}>
                        Kommentar: {item.comment}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Bilder</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <View key={photo.url} style={styles.photoContainer}>
                  <Image src={photo.url} style={styles.photo} />
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={[styles.section, { marginTop: 30 }]} break={false}>
          <Text style={styles.sectionTitle}>Signaturer</Text>
          <View style={styles.grid}>
            <View style={styles.col2}>
              <Text style={styles.label}>Utført av</Text>
              <Text style={styles.value}>
                {report.author.name || report.author.email}
              </Text>
            </View>
            {report.signatureUrl && (
              <View style={styles.col2}>
                <Text style={styles.label}>Kunde signatur</Text>
                <Image
                  src={report.signatureUrl}
                  style={{ width: 100, height: 50, objectFit: "contain" }}
                />
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Side ${pageNumber} av ${totalPages} • Generert av Rapport PWA`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
