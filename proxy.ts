import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="JurisAI", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export function proxy(request: NextRequest) {
  const password = process.env.JURISAI_ACCESS_PASSWORD;
  if (!password) return NextResponse.next();
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const supplied = separator >= 0 ? decoded.slice(separator + 1) : "";
    if (supplied.length !== password.length) return unauthorized();
    let difference = 0;
    for (let index = 0; index < password.length; index++) difference |= supplied.charCodeAt(index) ^ password.charCodeAt(index);
    return difference === 0 ? NextResponse.next() : unauthorized();
  } catch { return unauthorized(); }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"] };

