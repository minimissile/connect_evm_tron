import { defineChain } from "@reown/appkit/networks";

export const tronChain = defineChain({
  id: 195, // 自定义任意且唯一的 ID
  caipNetworkId: "tron:195",
  chainNamespace: "tron",
  name: "Tron Mainnet",
  nativeCurrency: { name: "TRX", symbol: "TRX", decimals: 6 },
  rpcUrls: { default: { http: ["https://api.trongrid.io"] } },
  blockExplorers: {
    default: { name: "TronScan", url: "https://tronscan.org" },
  },
  contracts: {},
});
