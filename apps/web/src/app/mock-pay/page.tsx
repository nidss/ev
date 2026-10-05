import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { MockPayView } from "./mock-pay-view";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MockPayView />
    </Suspense>
  );
}
