import { createMockCatalog } from "@ev/core";
import { SponsorView } from "./sponsor-view";

export function generateStaticParams() {
  return createMockCatalog().sponsors.map((s) => ({ sponsorId: s.id }));
}

export default async function Page(props: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await props.params;
  return <SponsorView sponsorId={sponsorId} />;
}
