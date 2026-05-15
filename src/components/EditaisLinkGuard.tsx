import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  validateEditaisPath,
  warnBrokenEditaisLink,
} from "@/lib/editaisLinkGuard";

/**
 * Componente headless que monitora navegações e cliques em anchors
 * apontando para /editais, emitindo warnings no console antes do usuário
 * cair em 404. Não renderiza nada.
 */
export default function EditaisLinkGuard() {
  const location = useLocation();

  // Valida a rota atual a cada navegação.
  useEffect(() => {
    warnBrokenEditaisLink(location.pathname, "navigation", {
      search: location.search,
    });
  }, [location.pathname, location.search]);

  // Intercepta cliques em <a href="/editais/..."> antes do React Router agir.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/editais")) return;

      // Ignora querystring/hash para a validação de pathname.
      const pathname = href.split("?")[0].split("#")[0];
      const result = validateEditaisPath(pathname);
      if (!result.valid) {
        warnBrokenEditaisLink(pathname, "anchor-click", {
          href,
          element: anchor.outerHTML.slice(0, 200),
        });
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return null;
}
