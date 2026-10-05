import { createMockCatalog } from "@ev/core";
import { VisitView } from "./visit-view";

export function generateStaticParams() {
  return createMockCatalog().booths.map((b) => ({ qrSlug: b.qrSlug }));
}

export default async function Page(props: { params: Promise<{ qrSlug: string }> }) {
  const { qrSlug } = await props.params;
  return <VisitView qrSlug={qrSlug} />;
}
