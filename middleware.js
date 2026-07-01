import { NextResponse } from "next/server";

export function middleware(req) {
  const auth = req.headers.get("authorization");
  const expectedUser = "admin";
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedPass) {
    return new NextResponse("ADMIN_PASSWORD is not configured on the server.", { status: 500 });
  }

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Snrkickz Returns Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
