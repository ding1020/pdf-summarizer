import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies
  for (const name of ["__session", "__client_uat", "__clerk_db_jwt", "__clerk_session_jwt", "__auth_token"]) {
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return response;
}
