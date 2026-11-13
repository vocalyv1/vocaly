import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

// Rafraîchit la session Supabase et protège l'espace client (/app).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && path.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  // Le compte est créé avant le quiz : le visiteur s'inscrit, puis répond aux questions.
  if (!data.user && path.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inscription";
    url.search = "";
    url.searchParams.set("next", path === "/onboarding/enregistrer" ? path : "/onboarding");
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/connexion", "/inscription", "/onboarding/:path*", "/auth/:path*"],
};
