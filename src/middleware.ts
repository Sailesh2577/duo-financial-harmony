import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

// Routes that start with these prefixes are public
const publicPrefixes = [
  "/join/", // Invite links (Issue #9)
];

// Auth pages (logged-in users should be redirected away)
const authRoutes = ["/login", "/signup"];

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) {
    return true;
  }
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function isServerAction(request: NextRequest): boolean {
  // Server actions have the "Next-Action" header
  return request.headers.has("Next-Action");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IMPORTANT: Let server actions through without redirect
  // Server actions are POST requests with "Next-Action" header
  if (isServerAction(request)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Update session and get user + household status
  const { user, hasHousehold, supabaseResponse } = await updateSession(request);

  // Helper to create redirects (preserves cookies from supabaseResponse)
  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const response = NextResponse.redirect(url);
    // Copy cookies from supabaseResponse to maintain session
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  };

  // CASE 1: Public routes
  if (isPublicRoute(pathname)) {
    // Redirect logged-in users away from auth pages
    if (user && authRoutes.includes(pathname)) {
      return redirect(hasHousehold ? "/dashboard" : "/onboarding");
    }
    return supabaseResponse;
  }

  // CASE 2: Protected routes - must be logged in
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  // CASE 3: Logged in - route based on household status
  if (pathname === "/onboarding" && hasHousehold) {
    // Has household but on onboarding → go to dashboard
    return redirect("/dashboard");
  }

  if (pathname.startsWith("/dashboard") && !hasHousehold) {
    // No household but trying to access dashboard → go to onboarding
    return redirect("/onboarding");
  }

  // User is authenticated and on the correct route
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
