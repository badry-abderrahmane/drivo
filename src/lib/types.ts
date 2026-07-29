export interface DriveNode {
  fileId: string;
  name: string;
  mimeType: string;
  path: string[];
  thumbnailLink?: string;
  webViewLink: string;
  modifiedTime: string;
  isFolder: boolean;
}

/** A row exactly as the Sheet/backend returns it (tags/order may be strings). */
export interface RawRow {
  fileId: string;
  level?: string;
  type?: string;
  subject?: string;
  chapter?: string;
  title?: string;
  description?: string;
  tags?: string;
  order?: number | string;
}

export interface MetaRow {
  fileId: string;
  level: string[];
  type: string;
  subject: string;
  chapter: string[];
  title: string;
  description: string;
  tags: string[];
  order: number;
}

export interface LibraryItem extends DriveNode {
  meta: MetaRow;
  displayTitle: string;
}
