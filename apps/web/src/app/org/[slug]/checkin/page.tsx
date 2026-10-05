import { EVENT_SLUG } from "@/lib/paths";
import { CheckinView } from "./checkin-view";

export function generateStaticParams() {
  return [{ slug: EVENT_SLUG }];
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <CheckinView slug={slug} />;
}
