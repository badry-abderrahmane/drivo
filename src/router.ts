import { createRouter, createWebHashHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import MenuView from "./views/MenuView.vue";
import ExamenNationalView from "./views/ExamenNationalView.vue";
import AdminView from "./views/AdminView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/menu", name: "menu", component: MenuView },
    { path: "/examen-national", name: "examen-national", component: ExamenNationalView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
