import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { EVENT_SLUG } from "@/lib/paths";
import { EventView } from "./event-view";

export function generateStaticParams() {
  return [{ slug: EVENT_SLUG }];
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return (
    <Suspense fallback={<Loading />}>
      <EventView slug={slug} />
    </Suspense>
  );
}
