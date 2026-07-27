import { BACKEND_URL } from "./config";
import type { RawManifest } from "./lib/cache";

export type { RawManifest };

export interface SaveInput {
  fileId: string;
  level: string;
  type: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  tags: string; // comma-separated for the Sheet
  order: number;
}

export async function fetchManifest(): Promise<RawManifest> {
  const res = await fetch(BACKEND_URL, { method: "GET" });
  if (!res.ok) throw new Error(`GET manifest failed: ${res.status}`);
  return (await res.json()) as RawManifest;
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow",
  });
  return (await res.json()) as T;
}

export function saveMeta(
  password: string,
  rows: SaveInput[]
): Promise<{ ok: boolean; error?: string }> {
  return post({ action: "save", password, rows });
}

export function reindex(
  password: string
): Promise<{ ok: boolean; error?: string; count?: number }> {
  return post({ action: "reindex", password });
}
