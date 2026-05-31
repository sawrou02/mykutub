import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Loader2, Trash2, Upload, Edit, Download } from "lucide-react";
import type { DigitalBook } from "@/lib/types";
import { sanitizeText, sanitizeMultiline } from "@/lib/sanitize";

const BUCKET = "digital-books";

export function AdminDigitalLibraryTab() {
  const [books, setBooks] = useState<DigitalBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("Arabe");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("digital_books" as never)
      .select("*")
      .order("created_at", { ascending: false });
    setBooks((data as DigitalBook[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setLanguage("Arabe");
    setCategory("");
    setDescription("");
    setExternalUrl("");
    setPdfFile(null);
    setCoverFile(null);
    if (pdfRef.current) pdfRef.current.value = "";
    if (coverRef.current) coverRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast.error("Titre et auteur requis");
      return;
    }
    if (!pdfFile && !externalUrl.trim()) {
      toast.error("Fournis un PDF ou un lien externe");
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = externalUrl.trim();
      let fileSize: number | null = null;

      if (pdfFile) {
        const path = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, pdfFile, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        fileUrl = pub.publicUrl;
        fileSize = pdfFile.size;
      }

      let coverUrl: string | null = null;
      if (coverFile) {
        const path = `covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, coverFile, { contentType: coverFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        coverUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("digital_books" as never).insert({
        title: sanitizeText(title),
        author: sanitizeText(author),
        language: sanitizeText(language) || "Arabe",
        category: sanitizeText(category) || null,
        description: sanitizeMultiline(description) || null,
        file_url: fileUrl,
        external_url: externalUrl.trim() || null,
        cover_url: coverUrl,
        file_size_bytes: fileSize,
      } as never);

      if (error) throw error;
      toast.success("Livre ajouté");
      resetForm();
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublished = async (book: DigitalBook) => {
    const { error } = await supabase
      .from("digital_books" as never)
      .update({ is_published: !book.is_published } as never)
      .eq("id", book.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchAll();
  };

  const handleDelete = async (book: DigitalBook) => {
    if (!confirm(`Supprimer "${book.title}" ?`)) return;
    const { error } = await supabase
      .from("digital_books" as never)
      .delete()
      .eq("id", book.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supprimé");
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <section className="bg-card border rounded-2xl p-5">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Upload size={16} /> Ajouter un livre digital
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dl-title">Titre *</Label>
              <Input
                id="dl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-author">Auteur *</Label>
              <Input
                id="dl-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-lang">Langue</Label>
              <Input
                id="dl-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Arabe, Français, Anglais..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-cat">Catégorie (optionnel)</Label>
              <Input
                id="dl-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Aqida, Tafsir, Fiqh, Hadith..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dl-desc">Description (optionnel)</Label>
            <Textarea
              id="dl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dl-pdf">Fichier PDF</Label>
              <Input
                id="dl-pdf"
                ref={pdfRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[10px] text-muted-foreground">
                Ou laisse vide et utilise un lien externe (archive.org, etc.)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-cover">Couverture (optionnel)</Label>
              <Input
                id="dl-cover"
                ref={coverRef}
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dl-ext">Lien externe (alternative au PDF uploadé)</Label>
            <Input
              id="dl-ext"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://archive.org/..."
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Ajouter
          </Button>
        </form>
      </section>

      <section>
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <BookOpen size={16} /> Catalogue ({books.length})
        </h3>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun livre pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {books.map((b) => (
              <li key={b.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-14 flex-shrink-0 rounded bg-muted overflow-hidden">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.author}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{b.language}</span>
                    {b.category && <span>· {b.category}</span>}
                    <span className="flex items-center gap-0.5">
                      <Download size={9} /> {b.download_count}
                    </span>
                    {!b.is_published && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        Brouillon
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublished(b)}
                    title={b.is_published ? "Dépublier" : "Publier"}
                  >
                    <Edit size={13} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(b)}
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
