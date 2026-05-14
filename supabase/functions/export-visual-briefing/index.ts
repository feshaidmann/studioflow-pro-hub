// Direção Visual — exporta o briefing como PDF e devolve URL assinada.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addSection(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(title.toUpperCase(), 14, y);
  doc.setDrawColor(200);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 7;
}

function addText(doc: jsPDF, y: number, text: string, opts: { size?: number; bold?: boolean } = {}): number {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? 10);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(text || "—", 182);
  doc.text(lines, 14, y);
  return y + lines.length * (opts.size ?? 10) * 0.45 + 2;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 285) {
    doc.addPage();
    return 18;
  }
  return y;
}

function dataUrlToBase64(url: string): { base64: string; format: string } | null {
  const m = url.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!m) return null;
  return { format: m[1].toUpperCase() === "JPG" ? "JPEG" : m[1].toUpperCase(), base64: m[2] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { briefing_id } = await req.json().catch(() => ({}));
    if (!briefing_id) {
      return new Response(JSON.stringify({ error: "briefing_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: briefing, error } = await supabase
      .from("visual_briefings")
      .select("id, user_id, project_id, artistic_profile, approved_images, generated_images, generated_palette, approved_copy, designer_notes, created_at")
      .eq("id", briefing_id)
      .maybeSingle();
    if (error || !briefing || briefing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Briefing não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name, artist")
      .eq("id", briefing.project_id)
      .maybeSingle();

    const profile = (briefing.artistic_profile as any) ?? {};
    const palette = (briefing.generated_palette as any) ?? {};
    const approvedImgs: any[] = Array.isArray(briefing.approved_images) && briefing.approved_images.length
      ? briefing.approved_images as any[]
      : ((briefing.generated_images as any[]) ?? []).filter((i: any) => i.selected);

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(8, 8, 16);
    doc.text("Direção Visual", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    const headerLine = `${project?.artist || "—"} · ${project?.name || "—"} · ${new Date(briefing.created_at).toLocaleDateString("pt-BR")}`;
    doc.text(headerLine, 14, 25);
    doc.setDrawColor(220);
    doc.line(14, 28, 196, 28);

    let y = 36;

    y = addSection(doc, y, "Gênero");
    y = addText(doc, y, (profile.genres || []).join(" · ") || "—");
    y += 2;

    y = ensureSpace(doc, y, 20);
    y = addSection(doc, y, "Mood");
    y = addText(doc, y, (profile.moods || []).join(" · ") || "—");
    y += 2;

    y = ensureSpace(doc, y, 20);
    y = addSection(doc, y, "Referências");
    y = addText(doc, y, profile.artist_refs || "—");
    if (profile.external_refs) y = addText(doc, y, "Externas: " + profile.external_refs);
    if (profile.identity_phrase) y = addText(doc, y, "Frase identitária: \"" + profile.identity_phrase + "\"", { bold: true });
    y += 2;

    // Imagens — Direção Estética
    if (approvedImgs.length > 0) {
      y = ensureSpace(doc, y, 70);
      y = addSection(doc, y, "Direção Estética");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Todas as imagens são REFERÊNCIAS DE ESTILO geradas por IA — não são arte final.", 14, y);
      y += 5;

      const cellW = 56, cellH = 56, gap = 5;
      let col = 0;
      for (const img of approvedImgs) {
        if (!img?.url) continue;
        const parsed = dataUrlToBase64(img.url);
        if (!parsed) continue;
        const x = 14 + col * (cellW + gap);
        if (y + cellH + 8 > 285) { doc.addPage(); y = 18; col = 0; }
        try {
          doc.addImage(parsed.base64, parsed.format as any, x, y, cellW, cellH, undefined, "FAST");
        } catch (e) {
          console.error("addImage failed", e);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(110);
        doc.text("Ref: " + (img.style_tag || "estilo"), x, y + cellH + 3);
        col += 1;
        if (col === 3) { col = 0; y += cellH + 8; }
      }
      if (col !== 0) y += cellH + 8;
      y += 4;
    }

    // Paleta
    if (Array.isArray(palette.colors) && palette.colors.length > 0) {
      y = ensureSpace(doc, y, 30);
      y = addSection(doc, y, "Paleta");
      const swSize = 16, swGap = 4;
      palette.colors.forEach((hex: string, idx: number) => {
        const x = 14 + idx * (swSize + swGap);
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        doc.setFillColor(r, g, b);
        doc.setDrawColor(220);
        doc.rect(x, y, swSize, swSize, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(110);
        doc.text(hex, x, y + swSize + 3);
      });
      y += swSize + 8;
      if (palette.rationale) y = addText(doc, y, palette.rationale, { size: 9 });
      y += 2;
    }

    // Copy aprovada
    if (briefing.approved_copy) {
      y = ensureSpace(doc, y, 25);
      y = addSection(doc, y, "Copy Aprovada");
      y = addText(doc, y, briefing.approved_copy);
      y += 2;
    }

    // Notas
    if (briefing.designer_notes) {
      y = ensureSpace(doc, y, 20);
      y = addSection(doc, y, "Notas para o Designer");
      y = addText(doc, y, briefing.designer_notes);
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text("Gerado via StudioFlow Pro · Direção Visual", 14, 292);
      doc.text(`${i}/${totalPages}`, 196, 292, { align: "right" } as any);
    }

    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    const path = `${user.id}/${briefing.id}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("briefings")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await supabase.storage
      .from("briefings")
      .createSignedUrl(path, 60 * 60);
    if (signErr) throw signErr;

    await supabase
      .from("visual_briefings")
      .update({ pdf_url: signed.signedUrl })
      .eq("id", briefing.id);

    return new Response(JSON.stringify({ url: signed.signedUrl, path }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("export-visual-briefing error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
