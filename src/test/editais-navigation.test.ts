/**
 * Garante que toda navegação para /editais no código-fonte aponte
 * exclusivamente para `/editais/inscricao/:id` (rota ativa).
 *
 * Escopo: strings de URL em `navigate(...)`, `href=`, `to=`, `Link to=`,
 * `redirect(...)` e templates equivalentes. Imports de módulos
 * (`@/types/editais`, `@/components/editais/...`) são ignorados porque
 * são caminhos de alias, não URLs.
 *
 * Arquivos excluídos:
 *   - src/App.tsx                       → declara os redirects legados (/editais → /carreira)
 *   - src/lib/editaisLinkGuard.ts       → guard de runtime (referencia patterns)
 *   - src/components/EditaisLinkGuard.tsx
 *   - src/pages/NotFound.tsx            → fallback 404
 *   - arquivos de teste
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { validateEditaisPath } from "@/lib/editaisLinkGuard";

const SRC = join(__dirname, "..");
const EXCLUDE_FILES = new Set(
  [
    "App.tsx",
    "lib/editaisLinkGuard.ts",
    "components/EditaisLinkGuard.tsx",
    "pages/NotFound.tsx",
  ].map((p) => p.replace(/\//g, require("node:path").sep)),
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "test") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extrai ocorrências de URLs que começam com /editais a partir de
 * strings literais (simples, duplas ou template). Cada match preserva
 * o pathname (sem querystring) e substitui `${...}` por um UUID-canário
 * para validar via `validateEditaisPath`.
 */
function extractEditaisUrls(source: string): string[] {
  const urls: string[] = [];
  // 'string', "string", `template` que começam com /editais
  const re = /(["'`])(\/editais[^"'`?#]*)(?:[?#][^"'`]*)?\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const raw = m[2];
    // Substitui interpolações ${...} por um UUID válido p/ checagem
    const normalized = raw.replace(
      /\$\{[^}]+\}/g,
      "00000000-0000-4000-8000-000000000000",
    );
    urls.push(normalized);
  }
  return urls;
}

describe("navegação para /editais", () => {
  const files = walk(SRC).filter((f) => {
    const rel = relative(SRC, f);
    return !EXCLUDE_FILES.has(rel);
  });

  const offenders: Array<{ file: string; url: string; reason: string }> = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const url of extractEditaisUrls(src)) {
      const result = validateEditaisPath(url);
      if (result.valid === false) {
        offenders.push({
          file: relative(SRC, file),
          url,
          reason: result.reason,
        });
        continue;
      }
      // Além de "válido", exigimos que NÃO seja o redirect raiz /editais —
      // toda navegação deve apontar diretamente para /editais/inscricao/:id.
      if (url === "/editais" || url === "/editais/") {
        offenders.push({
          file: relative(SRC, file),
          url,
          reason:
            "uso do redirect raiz /editais — navegue diretamente para /editais/inscricao/:id ou para /carreira",
        });
      }
    }
  }

  it("não contém links quebrados nem usa o redirect raiz", () => {
    expect(
      offenders,
      `Links de /editais inválidos encontrados:\n${offenders
        .map((o) => `  - ${o.file}: "${o.url}" → ${o.reason}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

describe("validateEditaisPath", () => {
  it("aceita /editais/inscricao/:uuid", () => {
    expect(
      validateEditaisPath(
        "/editais/inscricao/11111111-1111-4111-8111-111111111111",
      ).valid,
    ).toBe(true);
  });

  it("aceita o redirect raiz /editais", () => {
    expect(validateEditaisPath("/editais").valid).toBe(true);
  });

  it("rejeita id de inscrição não-UUID", () => {
    expect(validateEditaisPath("/editais/inscricao/abc").valid).toBe(false);
  });

  it("rejeita rotas legadas sob /editais", () => {
    expect(validateEditaisPath("/editais/novo").valid).toBe(false);
    expect(validateEditaisPath("/editais/123/edit").valid).toBe(false);
  });

  it("ignora pathnames fora de /editais", () => {
    expect(validateEditaisPath("/carreira").valid).toBe(true);
    expect(validateEditaisPath("/dashboard").valid).toBe(true);
  });
});
