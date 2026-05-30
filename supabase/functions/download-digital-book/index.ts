// download-digital-book : proxy de téléchargement pour la bibliothèque digitale
//
// Reçoit un id de livre, récupère son external_url (ou file_url), fetch le
// fichier en amont et le renvoie au client avec les headers nécessaires pour
// déclencher un téléchargement (Content-Disposition: attachment).
//
// Si l'upstream renvoie du HTML (ex. page archive.org/details/... au lieu
// du PDF direct), on redirige le client en 302 vers l'URL d'origine — le
// download_count est quand même incrémenté pour que les stats refletent
// l'intention de téléchargement.
//
// Aucun auth nécessaire (catalogue public). Le compteur est best-effort.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function sanitizeFilename(title: string): string {
  const stripped = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim()
    .slice(0, 80);
  return (stripped || "livre") + ".pdf";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Fetch book metadata
    const { data: book, error } = await admin
      .from("digital_books")
      .select("title, file_url, external_url, is_published")
      .eq("id", id)
      .maybeSingle();

    if (error || !book || !book.is_published) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceUrl = (book.external_url as string | null) || (book.file_url as string);
    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "No source URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Increment counter (best-effort, no await)
    void admin.rpc("increment_digital_book_download", { _book_id: id }).then(() => {});

    // 3) Fetch upstream
    const upstream = await fetch(sourceUrl, {
      headers: { "User-Agent": "MyKutub/1.0 (+https://mykutub.lovable.app)" },
      redirect: "follow",
    });

    if (!upstream.ok) {
      // Upstream failed — redirect client to original page as fallback
      return Response.redirect(sourceUrl, 302);
    }

    const contentType = upstream.headers.get("content-type") || "";

    // 4a) If upstream is a PDF (or any binary), stream it back with
    // Content-Disposition: attachment to force download.
    if (
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream")
    ) {
      const filename = sanitizeFilename(book.title as string);
      const headers = new Headers({
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      });
      const len = upstream.headers.get("content-length");
      if (len) headers.set("Content-Length", len);
      return new Response(upstream.body, { headers });
    }

    // 4b) If upstream is HTML (archive.org details page), redirect.
    if (contentType.includes("text/html")) {
      return Response.redirect(sourceUrl, 302);
    }

    // 4c) Unknown content-type : pass it through as attachment best-effort.
    const filename = sanitizeFilename(book.title as string);
    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new Response(upstream.body, { headers });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
