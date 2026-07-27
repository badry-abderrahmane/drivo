// Maps a file to a Material Design icon + color for display on course cards.
// Prefers the Drive mimeType (reliable, and the only signal for Google-native
// files that have no extension), then falls back to the filename extension.

export interface FileKind {
  icon: string;
  color: string;
}

const PDF = { icon: "mdi-file-pdf-box", color: "#E53935" };
const WORD = { icon: "mdi-file-word-box", color: "#1E88E5" };
const EXCEL = { icon: "mdi-file-excel-box", color: "#43A047" };
const PPT = { icon: "mdi-file-powerpoint-box", color: "#FB8C00" };
const VIDEO = { icon: "mdi-file-video", color: "#8E24AA" };
const AUDIO = { icon: "mdi-file-music", color: "#00897B" };
const IMAGE = { icon: "mdi-file-image", color: "#00ACC1" };
const ARCHIVE = { icon: "mdi-folder-zip", color: "#6D4C41" };
const TEXT = { icon: "mdi-file-document-outline", color: "#607D8B" };
const DEFAULT: FileKind = { icon: "mdi-file-outline", color: "#757575" };

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
