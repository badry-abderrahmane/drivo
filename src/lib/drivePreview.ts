// Build embeddable Drive URLs for a file. The `/preview` variants render inside an
// iframe; the open variants are for "open in Drive" links. Google-native docs use
// their editor host; everything else uses the generic Drive file endpoint.

const GAPP = "application/vnd.google-apps.";

function docHost(mimeType?: string): string | null {
  if (mimeType === GAPP + "document") return "document";
  if (mimeType === GAPP + "spreadsheet") return "spreadsheets";
  if (mimeType === GAPP + "presentation") return "presentation";
  return null;
}

export function drivePreviewUrl(fileId: string, mimeType?: string): string {
  const host = docHost(mimeType);
  if (host) return `https://docs.google.com/${host}/d/${fileId}/preview`;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function driveOpenUrl(fileId: string, mimeType?: string): string {
  const host = docHost(mimeType);
  if (host) return `https://docs.google.com/${host}/d/${fileId}/edit`;
  return `https://drive.google.com/file/d/${fileId}/view`;
}
