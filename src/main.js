import "./assets/main.css";
import { createApp } from "vue";
import App from "./App.vue";
import { Buffer } from "buffer";
import VConsole from "vconsole";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

window.Buffer = Buffer;

const vConsole = new VConsole();

const app = createApp(App);

app.use(ElementPlus);

app.mount("#app");
