import "./assets/main.css";
import VConsole from "vconsole";

import { createApp } from "vue";
import App from "./App.vue";
import { Buffer } from "buffer";
window.Buffer = Buffer;

const vConsole = new VConsole();

createApp(App).mount("#app");
