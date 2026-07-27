import { loadLibrary } from "../lib/loadLibrary";
import { saveMeta, reindex as reindexApi, type SaveInput } from "../api";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import type { LibraryItem } from "../lib/types";

export function toSaveInput(it: LibraryItem): SaveInput {
  const m = it.meta;
  return {
    fileId: m.fileId, level: m.level, type: m.type, subject: m.subject,
    chapter: m.chapter, title: m.title, description: m.description,
    tags: m.tags.join(","), order: m.order,
  };
}

export interface AdminDeps {
  load: () => Promise<{ items: LibraryItem[]; stale: boolean }>;
  save: (password: string, rows: SaveInput[]) => Promise<{ ok: boolean; error?: string }>;
  reindex: (password: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
}

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function select(field: keyof SaveInput, value: string, options: string[]): HTMLSelectElement {
  const sel = el("select", { "data-field": field }) as HTMLSelectElement;
  sel.appendChild(new Option("—", ""));
  for (const o of options) sel.appendChild(new Option(o, o));
  sel.value = value;
  return sel;
}

function input(field: keyof SaveInput, value: string, placeholder: string): HTMLInputElement {
  const i = el("input", { "data-field": field, placeholder }) as HTMLInputElement;
  i.value = value;
  return i;
}

function row(it: LibraryItem): { node: HTMLElement; read: () => SaveInput } {
  const r = el("div", { "data-row": "", class: "arow" });
  r.appendChild(el("div", { class: "arow-name", title: it.name }, it.name));
  const title = input("title", it.meta.title, it.name);
  const level = select("level", it.meta.level, LEVELS);
  const type = select("type", it.meta.type, TYPES);
  const subject = select("subject", it.meta.subject, SUBJECTS);
  const chapter = input("chapter", it.meta.chapter, "Chapitre");
  const tags = input("tags", it.meta.tags.join(","), "tags,séparés,virgule");
  const desc = input("description", it.meta.description, "Description");
  const order = input("order", String(it.meta.order), "0");
  for (const f of [title, level, type, subject, chapter, tags, desc, order]) r.appendChild(f);
  const read = (): SaveInput => ({
    fileId: it.fileId, title: title.value, level: level.value, type: type.value,
    subject: subject.value, chapter: chapter.value, tags: tags.value,
    description: desc.value, order: Number(order.value) || 0,
  });
  return { node: r, read };
}

export function renderAdmin(root: HTMLElement, deps?: Partial<AdminDeps>): void {
  const d: AdminDeps = {
    load: deps?.load ?? loadLibrary,
    save: deps?.save ?? saveMeta,
    reindex: deps?.reindex ?? reindexApi,
  };
  root.innerHTML = "";
  const gate = el("div", { "data-gate": "", class: "gate" });
  const pw = el("input", { "data-pw": "", type: "password", placeholder: "Mot de passe" }) as HTMLInputElement;
  const unlock = el("button", { "data-unlock": "" }, "Déverrouiller");
  const msg = el("div", { class: "gate-msg" });
  gate.append(pw, unlock, msg);
  root.appendChild(gate);

  const showError = (text: string) => {
    msg.innerHTML = "";
    msg.appendChild(el("span", { "data-error": "" }, text));
  };

  unlock.addEventListener("click", async () => {
    msg.textContent = "Vérification…";
    // Validate the password with a no-op authenticated save before loading the editor.
    const auth = await d.save(pw.value, []);
    if (!auth.ok) {
      showError(auth.error === "unauthorized" ? "Mot de passe incorrect." : (auth.error ?? "Erreur."));
      return;
    }
    let loaded;
    try {
      loaded = await d.load();
    } catch {
      showError("Échec du chargement de la bibliothèque.");
      return;
    }
    renderEditor(root, d, pw.value, loaded.items, loaded.stale);
  });
}

function renderEditor(
  root: HTMLElement,
  d: AdminDeps,
  password: string,
  items: LibraryItem[],
  stale: boolean
): void {
  root.innerHTML = "";
  const editor = el("div", { "data-editor": "", class: "editor" });
  if (stale) editor.appendChild(el("div", { class: "banner" }, "Hors ligne — données en cache."));
  const toolbar = el("div", { class: "toolbar" });
  const saveBtn = el("button", { "data-save": "" }, "Enregistrer");
  const reindexBtn = el("button", { "data-reindex": "" }, "Réindexer Drive");
  const status = el("span", { class: "status" });
  toolbar.append(saveBtn, reindexBtn, status);
  editor.appendChild(toolbar);

  const rows = items.map((it) => {
    const r = row(it);
    editor.appendChild(r.node);
    return r;
  });
  root.appendChild(editor);

  saveBtn.addEventListener("click", async () => {
    status.textContent = "Enregistrement…";
    const res = await d.save(password, rows.map((r) => r.read()));
    status.textContent = res.ok ? "Enregistré ✓" : `Erreur : ${res.error ?? "inconnue"}`;
  });
  reindexBtn.addEventListener("click", async () => {
    status.textContent = "Réindexation…";
    const res = await d.reindex(password);
    status.textContent = res.ok ? `Réindexé (${res.count ?? "?"} fichiers) ✓` : `Erreur : ${res.error ?? "inconnue"}`;
  });
}
