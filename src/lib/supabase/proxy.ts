import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/login"]);

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (!isSupabaseAuthCookie(cookie.name)) {
      return;
    }

    request.cookies.delete(cookie.name);
    response.cookies.delete(cookie.name);
  });
}

function isSupabaseAuthCookie(cookieName: string) {
  return (
    cookieName.startsWith("sb-") ||
    cookieName === "supabase-auth-token" ||
    cookieName.startsWith("supabase-auth-token.")
  );
}

function isInvalidRefreshTokenError(error: unknown) {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error ? error.message : JSON.stringify(error);
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("invalid refresh token") ||
    normalizedMessage.includes("refresh token not found")
  );
}

export async function updateSupabaseSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let authError: unknown = null;
  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch (error) {
    authError = error;
  }

  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.has(pathname);

  if (isInvalidRefreshTokenError(authError)) {
    if (isPublicPath) {
      clearSupabaseAuthCookies(request, response);
      return response;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    clearSupabaseAuthCookies(request, redirectResponse);
    return redirectResponse;
  }

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyResponseCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyResponseCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}
