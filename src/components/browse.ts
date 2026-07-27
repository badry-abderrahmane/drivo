import { applyFilters, sortItems, distinctValues, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function selectFilter(key: keyof Filters, label: string, values: string[]): HTMLElement {
  const wrap = el("label", { class: "filter" });
  wrap.appendChild(el("span", {}, label));
  const sel = el("select", { "data-filter": key }) as HTMLSelectElement;
  sel.appendChild(new Option("Tous", ""));
  for (const v of values) sel.appendChild(new Option(v, v));
  wrap.appendChild(sel);
  return wrap;
}

function card(it: LibraryItem): HTMLElement {
  const c = el("article", { "data-card": "", class: "card" });
  if (it.meta.type) c.appendChild(el("span", { class: "badge" }, it.meta.type));
  c.appendChild(el("h3", {}, it.displayTitle));
  const sub = [it.meta.level, it.meta.chapter].filter(Boolean).join(" · ");
  if (sub) c.appendChild(el("p", { class: "sub" }, sub));
  if (it.meta.description) c.appendChild(el("p", { class: "desc" }, it.meta.description));
  const a = el("a", { href: it.webViewLink, target: "_blank", rel: "noopener", class: "open" }, "Ouvrir");
  c.appendChild(a);
  return c;
}

export function renderBrowse(root: HTMLElement, items: LibraryItem[], stale: boolean): void {
  root.innerHTML = "";
  if (stale) root.appendChild(el("div", { "data-stale": "", class: "banner" }, "Hors ligne — données en cache."));

  const state: Filters = {};
  const bar = el("div", { class: "filterbar" });
  bar.appendChild(selectFilter("level", "Niveau", distinctValues(items, "level")));
  bar.appendChild(selectFilter("type", "Type", distinctValues(items, "type")));
  bar.appendChild(selectFilter("subject", "Matière", distinctValues(items, "subject")));
  bar.appendChild(selectFilter("chapter", "Chapitre", distinctValues(items, "chapter")));
  const searchWrap = el("label", { class: "filter" });
  searchWrap.appendChild(el("span", {}, "Recherche"));
  const search = el("input", { type: "search", "data-filter": "search", placeholder: "titre ou tag…" });
  searchWrap.appendChild(search);
  bar.appendChild(searchWrap);
  root.appendChild(bar);

  const grid = el("div", { class: "grid" });
  root.appendChild(grid);

  const rerender = () => {
    grid.innerHTML = "";
    const shown = sortItems(applyFilters(items, state));
    if (shown.length === 0) grid.appendChild(el("p", { class: "empty" }, "Aucun résultat."));
    for (const it of shown) grid.appendChild(card(it));
  };

  bar.querySelectorAll("select[data-filter]").forEach((s) =>
    s.addEventListener("change", (e) => {
      const t = e.target as HTMLSelectElement;
      (state as Record<string, string>)[t.dataset.filter!] = t.value;
      rerender();
    })
  );
  search.addEventListener("input", (e) => {
    state.search = (e.target as HTMLInputElement).value;
    rerender();
  });

  rerender();
}
