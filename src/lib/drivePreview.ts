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

/**
 * A URL that saves the file rather than opening it. Google-native docs have no binary to
 * download, so they are exported as PDF; everything else uses Drive's direct-download
 * endpoint. Reuses the same mime-type split as the preview and open URLs.
 */
export function driveDownloadUrl(fileId: string, mimeType?: string): string {
  const host = docHost(mimeType);
  if (host) return `https://docs.google.com/${host}/d/${fileId}/export?format=pdf`;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
