import { NextRequest, NextResponse } from "next/server";
import { aroConfig, resolveCheckoutAccess } from "./lib/aro/client";
import { openSession, sessionCookie } from "./lib/aro/core";
export async function proxy(request: NextRequest) {
  if (!/\.(pdf|zip|md|docx)$/i.test(request.nextUrl.pathname))
    return NextResponse.next();
  const product = /\/conteudo\/produto-0([1-5])\//.exec(
    request.nextUrl.pathname,
  )?.[1];
  if (!product) return new NextResponse(null, { status: 403 });
  try {
    const key = aroConfig().serverKey;
    const capability = key
      ? openSession(request.cookies.get(sessionCookie)?.value, key)
      : null;
    const products = capability ? await resolveCheckoutAccess(capability) : [];
    if (products.includes("p0" + product)) {
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch {
    /* fail closed */
  }
  return new NextResponse("Acesso reservado", {
    status: 403,
    headers: { "Cache-Control": "no-store" },
  });
}
export const config = { matcher: ["/conteudo/:path*"] };
