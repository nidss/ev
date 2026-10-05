import { EVENT_SLUG } from "@/lib/paths";
import { EventView } from "./event-view";

export function generateStaticParams() {
  return [{ slug: EVENT_SLUG }];
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <EventView slug={slug} />;
}
