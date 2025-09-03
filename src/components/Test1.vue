<template>
  <div class="p-4">
    <h2 class="text-xl font-bold">WalletConnect Tron Vue3 示例</h2>

    <div v-if="!address" class="space-x-4 mt-4">
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded"
        @click="connectWallet('v2')"
      >
        连接 WalletConnect v2
      </button>
      <button
        class="px-4 py-2 bg-green-500 text-white rounded"
        @click="connectWallet('v3')"
      >
        连接 WalletConnect v3
      </button>
    </div>

    <div v-else class="mt-4">
      <p>已连接地址: {{ address }}</p>
      <button
        class="mt-2 px-4 py-2 bg-purple-500 text-white rounded"
        @click="getBalance"
      >
        查询余额
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TronWeb from "tronweb";
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";

const address = ref<string | null>(null);
const tronWeb = ref<any>(null);

// WalletConnect v2 配置
const wcV2Options = {
  network: "Mainnet", // 使用 Mainnet 而不是 chainId
  options: {
    projectId: "c34b3bde7397ea7ed6780e9ce1d5194d", // 使用有效的 projectId
    relayUrl: "wss://relay.walletconnect.com",
    metadata: {
      name: "Vue Tron Dapp",
      description: "WalletConnect v2 + Tron demo",
      url: "http://localhost:5174",
      icons: ["https://walletconnect.com/walletconnect-logo.png"],
    },
  },
};

// WalletConnect v3 配置
const wcV3Options = {
  network: "Mainnet", // 使用 Mainnet 而不是 chainId
  options: {
    projectId: "c34b3bde7397ea7ed6780e9ce1d5194d", // 使用有效的 projectId
    relayUrl: "wss://relay.walletconnect.org",
    metadata: {
      name: "Vue Tron Dapp",
      description: "WalletConnect v3 + Tron demo",
      url: "http://localhost:5174",
      icons: ["https://walletconnect.com/walletconnect-logo.png"],
    },
    version: "2.1", // v3 要指定协议版本
  },
};

async function connectWallet(v: "v2" | "v3") {
  try {
    const adapter = new WalletConnectAdapter(
      v === "v2" ? wcV2Options : wcV3Options,
    );
    await adapter.connect();

    if (adapter.connected && adapter.address) {
      address.value = adapter.address;

      // 创建 TronWeb 实例
      const tron = new (TronWeb as any)({
        fullHost: "https://api.trongrid.io",
        privateKey: false,
      });
      tron.setAddress(adapter.address);
      tronWeb.value = tron;
    }
  } catch (error) {
    console.error("连接钱包失败:", error);
    alert("连接钱包失败: " + (error as Error).message);
  }
}

async function getBalance() {
  if (!tronWeb.value || !address.value) return;
  try {
    const balance = await tronWeb.value.trx.getBalance(address.value);
    alert(`余额: ${balance / 1e6} TRX`);
  } catch (error) {
    console.error("获取余额失败:", error);
    alert("获取余额失败: " + (error as Error).message);
  }
}
</script>
