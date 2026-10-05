import { createMockCatalog } from "@ev/core";
import { StaffView } from "./staff-view";

export function generateStaticParams() {
  return createMockCatalog().booths.map((b) => ({ boothId: b.id }));
}

export default async function Page(props: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await props.params;
  return <StaffView boothId={boothId} />;
}
