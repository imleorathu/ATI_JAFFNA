import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function useCmsPage(slug) {
  const [page, setPage] = useState(null);

  useEffect(() => {
    let active = true;

    apiFetch(`/api/cms/public/pages/${slug}`)
      .then((result) => {
        if (active) setPage(result);
      })
      .catch(() => {
        if (active) setPage(null);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return page;
}

export function usePageSeo(page, fallbackTitle, fallbackDescription) {
  useEffect(() => {
    const content = page?.published;
    const title = content?.seoTitle || fallbackTitle;
    const description = content?.seoDescription || fallbackDescription;

    if (title) document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [fallbackDescription, fallbackTitle, page]);
}
