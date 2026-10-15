import { NextRequest, NextResponse } from "next/server";
import { currentCapability, resolveCheckoutAccess } from "@/lib/aro/client";
/** Compatibility surface: resolves ARO access; never creates a local token or grant. */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const capability = await currentCapability();
    if (!capability)
      return NextResponse.json({ error: "checkout_missing" }, { status: 401 });
    const productRefs = await resolveCheckoutAccess(capability);
    return NextResponse.json(
      {
        ok: productRefs.length > 0,
        offerId: capability.offer.replace(/-br$/, ""),
        productRefs,
      },
      {
        status: productRefs.length ? 200 : 202,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json({ error: "access_unavailable" }, { status: 503 });
  }
}
