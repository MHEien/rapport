import { InventoryPageClient } from "./client";

export const metadata = {
  title: "Varebeholdning | Rapport",
  description: "Last opp og administrer van-inventar",
};

export default function InventoryPage() {
  return <InventoryPageClient />;
}
