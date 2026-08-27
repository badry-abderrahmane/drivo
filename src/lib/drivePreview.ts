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
 * The public thumbnail endpoint at a chosen width. The backend hands us this same URL at
 * `sz=w400` inside `thumbnailLink`, which is fine for a card in the grid but too small for
 * a link preview: Open Graph wants at least 600px wide before it will consider a large
 * card. Rebuilding rather than rewriting keeps the width a caller's decision.
 *
 * Drive caps the render around 1024px on the long edge, so asking for w1200 yields the
 * largest available rather than an error.
 */
export function driveThumbnailUrl(fileId: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
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
