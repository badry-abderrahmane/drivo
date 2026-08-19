import { createRouter, createWebHistory, type RouterScrollBehavior } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import MenuView from "./views/MenuView.vue";
import ExamenNationalView from "./views/ExamenNationalView.vue";
import DocView from "./views/DocView.vue";
import AdminView from "./views/AdminView.vue";

/** Give up waiting for the page to grow, and restore whatever we can. */
const RESTORE_TIMEOUT_MS = 1200;

/**
 * Resolve once the document is tall enough to hold `top`, or once we give up.
 *
 * A fixed delay does not work here. The page transition is `mode="out-in"`, so the
 * incoming view only mounts after the outgoing one leaves, and it then needs a frame or
 * more to lay out its list. Restore before that and the browser clamps the offset to
 * whatever scroll exists at that instant — measured at 351px instead of 600px, and 181px
 * instead of 900px. Waiting on the actual height is the thing that is really being
 * waited for; time was only ever a proxy for it.
 */
function whenTallEnough(top: number): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const check = (): void => {
      const fits = document.documentElement.scrollHeight >= top + window.innerHeight;
      if (fits || Date.now() - startedAt >= RESTORE_TIMEOUT_MS) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

/**
 * A new destination starts at the top; Back and Forward return you to where you were.
 *
 * Without this the router leaves the scroll offset untouched, so opening a document from
 * halfway down a chapter listing dropped you halfway down the document page.
 */
const scrollBehavior: RouterScrollBehavior = async (_to, _from, savedPosition) => {
  // Forward navigation: top, immediately — a delay here would show the new page briefly
  // at the old offset and then jump.
  if (!savedPosition) return { top: 0 };

  await whenTallEnough(savedPosition.top);
  return savedPosition;
};

// Path-based navigation state (not query params) so every level and chapter is a real
// URL that can be prerendered to a static file and indexed. `?search=` stays a query
// param: a result set is not a page worth indexing.
export default createRouter({
  scrollBehavior,
  history: createWebHistory("/"),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/niveau/:level", name: "level", component: BrowseView },
    { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: BrowseView },
    { path: "/menu", name: "menu", component: MenuView },
    { path: "/menu/:level", name: "menu-level", component: MenuView },
    { path: "/examen-national", name: "examen-national", component: ExamenNationalView },
    { path: "/examen-national/:level", name: "examen-national-level", component: ExamenNationalView },
    { path: "/doc/:fileId/:slug?", name: "doc", component: DocView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
