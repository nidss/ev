import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { EVENT_SLUG } from "@/lib/paths";
import { BadgeView } from "./badge-view";

export function generateStaticParams() {
  return [{ slug: EVENT_SLUG }];
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <BadgeView />
    </Suspense>
  );
}
