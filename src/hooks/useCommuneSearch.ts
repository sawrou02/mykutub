import { useEffect, useState } from "react";

export type Commune = {
  nom: string;
  codePostal: string;
  codesPostaux: string[];
  code: string;
};

type ApiCommune = {
  nom: string;
  code: string;
  codesPostaux?: string[];
};

/**
 * Autocomplete des communes françaises via l'API officielle geo.api.gouv.fr.
 * Couvre les ~35 000 communes, sans clé API.
 */
export function useCommuneSearch(query: string) {
  const [options, setOptions] = useState<Commune[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://geo.api.gouv.fr/communes");
        url.searchParams.set("nom", q);
        url.searchParams.set("fields", "nom,code,codesPostaux");
        url.searchParams.set("boost", "population");
        url.searchParams.set("limit", "20");
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          setOptions([]);
          return;
        }
        const data = (await res.json()) as ApiCommune[];
        setOptions(
          data.map((c) => ({
            nom: c.nom,
            code: c.code,
            codesPostaux: c.codesPostaux ?? [],
            codePostal: c.codesPostaux?.[0] ?? "",
          })),
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return { options, loading };
}
