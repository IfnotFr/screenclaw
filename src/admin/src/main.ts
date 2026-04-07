import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./style.css";

import Dashboard from "./views/Dashboard.vue";
import Missions from "./views/Missions.vue";
import MissionEditor from "./views/MissionEditor.vue";
import Skills from "./views/Skills.vue";
import SkillEditor from "./views/SkillEditor.vue";
import Logs from "./views/Logs.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Dashboard },
    { path: "/missions", component: Missions },
    { path: "/missions/:id", component: MissionEditor },
    { path: "/skills", component: Skills },
    { path: "/skills/:type/:name", component: SkillEditor },
    { path: "/logs", component: Logs },
  ],
});

createApp(App).use(router).mount("#app");
