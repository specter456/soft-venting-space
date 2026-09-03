import { useEffect } from "react";

interface DocumentHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
}

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://venting.app";

/**
 * Sets document <title> and meta tags per page.
 * Public pages get full OG + canonical; private pages get just the title.
 */
export function DocumentHead({
  title,
  description,
  canonical,
}: DocumentHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} — Venting` : "Venting — a tiny safe room in your phone";
    document.title = fullTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }

    // Update canonical
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", `${SITE_URL}${canonical}`);
    }

    // Update OG tags
    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", `${title} — Venting`);
    }
    if (description) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
    }
    if (canonical) {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", `${SITE_URL}${canonical}`);
    }
  }, [title, description, canonical]);

  return null;
}
