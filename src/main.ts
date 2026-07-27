import { loadLibrary } from "./lib/loadLibrary";
import { renderBrowse } from "./components/browse";

const root = document.getElementById("app")!;
root.textContent = "Chargement…";

loadLibrary()
  .then(({ items, stale }) => renderBrowse(root, items, stale))
  .catch(() => {
    root.textContent = "Impossible de charger la bibliothèque. Réessayez plus tard.";
  });
