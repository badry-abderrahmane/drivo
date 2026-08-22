// Maps a file to a Material Design icon + colour for display on course cards.
//
// `color` is a THEME TOKEN NAME, not a hex. It used to be a literal Material 500 value,
// which made the tiles the one part of the app the palette could not reach: they stayed
// tuned for white while the surface under them went dark, and the glyph fell to 2.09:1
// against its own wash. The hexes now live per-mode in plugins/theme.ts.
// Prefers the Drive mimeType (reliable, and the only signal for Google-native
// files that have no extension), then falls back to the filename extension.

export interface FileKind {
  icon: string;
  /** A theme token name — resolve it through `--v-theme-*`, never as a literal colour. */
  color: FileColor;
}

export const FILE_COLORS = [
  "file-pdf", "file-word", "file-excel", "file-ppt", "file-video",
  "file-audio", "file-image", "file-archive", "file-text", "file-generic",
] as const;

export type FileColor = (typeof FILE_COLORS)[number];

const PDF: FileKind = { icon: "mdi-file-pdf-box", color: "file-pdf" };
const WORD: FileKind = { icon: "mdi-file-word-box", color: "file-word" };
const EXCEL: FileKind = { icon: "mdi-file-excel-box", color: "file-excel" };
const PPT: FileKind = { icon: "mdi-file-powerpoint-box", color: "file-ppt" };
const VIDEO: FileKind = { icon: "mdi-file-video", color: "file-video" };
const AUDIO: FileKind = { icon: "mdi-file-music", color: "file-audio" };
const IMAGE: FileKind = { icon: "mdi-file-image", color: "file-image" };
const ARCHIVE: FileKind = { icon: "mdi-folder-zip", color: "file-archive" };
const TEXT: FileKind = { icon: "mdi-file-document-outline", color: "file-text" };
const DEFAULT: FileKind = { icon: "mdi-file-outline", color: "file-generic" };

const BY_EXT: Record<string, FileKind> = {
  pdf: PDF,
  doc: WORD, docx: WORD, odt: WORD, rtf: WORD,
  xls: EXCEL, xlsx: EXCEL, csv: EXCEL, ods: EXCEL,
  ppt: PPT, pptx: PPT, odp: PPT,
  mp4: VIDEO, mov: VIDEO, avi: VIDEO, mkv: VIDEO, webm: VIDEO, flv: VIDEO, wmv: VIDEO,
  mp3: AUDIO, wav: AUDIO, m4a: AUDIO, aac: AUDIO, ogg: AUDIO,
  png: IMAGE, jpg: IMAGE, jpeg: IMAGE, gif: IMAGE, webp: IMAGE, svg: IMAGE, bmp: IMAGE,
  zip: ARCHIVE, rar: ARCHIVE, "7z": ARCHIVE, tar: ARCHIVE, gz: ARCHIVE,
  txt: TEXT,
};

const BY_MIME: Record<string, FileKind> = {
  "application/pdf": PDF,
  "application/vnd.google-apps.document": WORD,
  "application/vnd.google-apps.spreadsheet": EXCEL,
  "application/vnd.google-apps.presentation": PPT,
};

export function fileKind(name: string, mimeType?: string): FileKind {
  if (mimeType) {
    if (BY_MIME[mimeType]) return BY_MIME[mimeType];
    if (mimeType.startsWith("video/")) return VIDEO;
    if (mimeType.startsWith("image/")) return IMAGE;
    if (mimeType.startsWith("audio/")) return AUDIO;
  }
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return BY_EXT[ext] ?? DEFAULT;
}

/**
 * The inline style for a file's tile: a faint wash of its colour behind the glyph.
 *
 * Here rather than repeated at each of the six call sites, so the wash and the glyph can
 * never drift apart, and so the token is resolved through the theme in one place.
 */
export function kindTile(kind: FileKind, alpha = 0.09): Record<string, string> {
  return {
    backgroundColor: `rgba(var(--v-theme-${kind.color}), ${alpha})`,
    color: `rgb(var(--v-theme-${kind.color}))`,
  };
}
