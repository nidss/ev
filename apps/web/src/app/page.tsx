import { redirect } from "next/navigation";
import { DEFAULT_EVENT_SLUG } from "@/lib/server";

export default function Home() {
  redirect(`/e/${DEFAULT_EVENT_SLUG}`);
}
