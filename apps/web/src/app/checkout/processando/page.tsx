import { notFound } from "next/navigation";
import { ClaimAccess } from "@/components/checkout/claim-access";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sessionId = (await searchParams).session_id;
  if (!sessionId) notFound();
  return <ClaimAccess sessionId={sessionId} />;
}
