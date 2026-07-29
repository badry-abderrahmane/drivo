// The Drive folder tree, derived on the client from the `path` each file carries.
// Folders are not library items of their own (buildLibrary drops isFolder nodes), so a
// folder holding no files anywhere beneath it simply never appears here — which is right,
// since an empty folder has nothing to classify.

import { isClassified, type Classifiable } from "./classification";

export interface FolderNode {
  name: string;
  /** Path from the Drive root; also this node's identity. Empty for the root. */
  path: string[];
  children: FolderNode[];
  /** Recursive: files anywhere beneath this node, plus files directly in it. */
  fileCount: number;
  classified: number;
  /** Rounded; 0 when fileCount is 0. */
  percent: number;
}

/** Everything the tree needs from a file: where it sits, and its four fields. */
export type FolderFile = Classifiable & { path: string[] };

function node(name: string, path: string[]): FolderNode {
  return { name, path, children: [], fileCount: 0, classified: 0, percent: 0 };
}

function finalize(n: FolderNode): void {
  n.percent = n.fileCount === 0 ? 0 : Math.round((n.classified / n.fileCount) * 100);
  n.children.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  for (const c of n.children) finalize(c);
}

/** Build the tree. Returns the synthetic root, which holds every file. */
export function buildFolderTree(files: FolderFile[]): FolderNode {
  const root = node("Tout", []);
  for (const file of files) {
    const done = isClassified(file);
    let current = root;
    current.fileCount++;
    if (done) current.classified++;
    for (let i = 0; i < file.path.length; i++) {
      const name = file.path[i];
      let child = current.children.find((c) => c.name === name);
      if (!child) {
        child = node(name, file.path.slice(0, i + 1));
        current.children.push(child);
      }
      child.fileCount++;
      if (done) child.classified++;
      current = child;
    }
  }
  finalize(root);
  return root;
}

/**
 * Files under `path`. Recursive matches the whole subtree (an empty path means
 * everything); non-recursive matches only files sitting directly in that folder.
 */
export function filesUnder<T extends { path: string[] }>(
  files: T[],
  path: string[],
  recursive: boolean
): T[] {
  return files.filter((f) => {
    if (!recursive && f.path.length !== path.length) return false;
    return path.every((seg, i) => f.path[i] === seg);
  });
}
