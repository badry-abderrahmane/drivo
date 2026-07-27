import { createRouter, createWebHashHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import AdminView from "./views/AdminView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
