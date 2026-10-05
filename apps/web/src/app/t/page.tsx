import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { TicketsView } from "./tickets-view";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <TicketsView />
    </Suspense>
  );
}
