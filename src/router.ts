import { createRouter, createWebHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import MenuView from "./views/MenuView.vue";
import ExamenNationalView from "./views/ExamenNationalView.vue";
import AdminView from "./views/AdminView.vue";

// Path-based navigation state (not query params) so every level and chapter is a real
// URL that can be prerendered to a static file and indexed. `?search=` stays a query
// param: a result set is not a page worth indexing.
export default createRouter({
  history: createWebHistory("/drivo/"),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/niveau/:level", name: "level", component: BrowseView },
    { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: BrowseView },
    { path: "/menu", name: "menu", component: MenuView },
    { path: "/menu/:level", name: "menu-level", component: MenuView },
    { path: "/examen-national", name: "examen-national", component: ExamenNationalView },
    { path: "/examen-national/:level", name: "examen-national-level", component: ExamenNationalView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
