import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet } from "@reown/appkit/networks";
import { tronChain } from "@/networks/tron";
import { createQueryClient } from "@tanstack/vue-query";

const projectId = "c34b3bde7397ea7ed6780e9ce1d5194d";
if (!projectId) throw new Error("VITE_REOWN_PROJECT_ID 未定义");

console.log("tronChain", tronChain);

const networks = [mainnet, tronChain];

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Vue3 Tron App",
    description: "AppKit + Tron 示例",
    url: window.location.origin,
    icons: [],
  },
  features: { analytics: false },
});
