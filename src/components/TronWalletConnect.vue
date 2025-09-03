<template>
  <div class="tron-wallet-connect">
    <h2>Tron WalletConnect 适配器测试</h2>
    <div class="wallet-info">
      <p><strong>连接状态:</strong> {{ connected ? "已连接" : "未连接" }}</p>
      <p v-if="adapter">
        <strong>适配器状态:</strong>
        {{ adapter.connected ? "适配器已连接" : "适配器未连接" }}
      </p>
      <p v-if="connected"><strong>地址:</strong> {{ address }}</p>
      <p v-if="connected"><strong>余额:</strong> {{ balance }} TRX</p>
      <p v-if="error" class="error"><strong>错误:</strong> {{ error }}</p>
      <div v-if="connecting" class="connecting-info">
        <p>🔄 正在连接钱包...</p>
        <p class="tip">💡 提示：请在弹出的钱包选择界面中选择您的钱包</p>
      </div>
    </div>

    <div class="actions">
      <button v-if="!connected" @click="openWalletModal" :disabled="connecting">
        {{ connecting ? "连接中..." : "选择钱包" }}
      </button>
      <button
        v-if="!connected"
        @click="connectWallet"
        :disabled="connecting"
        class="secondary-btn"
      >
        {{ connecting ? "连接中..." : "直接连接" }}
      </button>
      <button v-if="connected" @click="disconnectWallet">断开连接</button>
      <button v-if="connected" @click="getBalance">刷新余额</button>
      <button @click="debugAdapter" class="debug-btn">调试适配器</button>
    </div>

    <!-- 移动端深链接备选方案：当 Modal 未正常弹出时使用 -->
    <div v-if="!connected && wcUri && isMobile" class="mobile-fallback">
      <p class="tip">
        📱 如果手机上未弹出钱包选择界面，可以尝试使用深链接打开钱包：
      </p>
      <div class="mobile-actions">
        <button class="open-wallet-btn" @click="openDeepLink">
          在钱包中打开
        </button>
        <button class="copy-btn" @click="copyUri">
          复制 WalletConnect URI
        </button>
      </div>
      <details class="uri-details">
        <summary>显示 WalletConnect URI</summary>
        <p class="uri-text">{{ wcUri }}</p>
      </details>
    </div>
  </div>
</template>

<script>
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";

export default {
  name: "TronWalletConnect",
  data() {
    return {
      adapter: null,
      tronWeb: null,
      connected: false,
      connecting: false,
      address: "",
      balance: "0",
      error: "",
      wcUri: "",
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    };
  },
  mounted() {
    this.initializeTronWeb();
    this.initializeAdapter();
  },
  methods: {
    initializeTronWeb() {
      console.log("Skipping TronWeb initialization for now");
    },

    initializeAdapter() {
      try {
        this.adapter = new WalletConnectAdapter({
          network: "Mainnet",
          options: {
            relayUrl: "wss://relay.walletconnect.com",
            projectId: "c34b3bde7397ea7ed6780e9ce1d5194d",
            metadata: {
              name: "Tron Wallet Test",
              description: "Testing Tron WalletConnect Adapter",
              url: window.location.origin,
              icons: [window.location.origin + "/favicon.ico"],
            },
          },
          web3ModalConfig: {
            themeMode: "light",
            themeVariables: {
              "--w3m-z-index": "99999",
              "--w3m-accent-color": "#ff6b35",
              "--w3m-background-color": "#ffffff",
            },
            explorerRecommendedWalletIds: [
              "225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f",
              "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
              "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
            ],
            // enableExplorer: true,
            // enableNetworkView: true,
            // enableAccountView: true,
          },
        });

        // 监听连接状态变化
        this.adapter.on("connect", this.onConnect);
        this.adapter.on("disconnect", this.onDisconnect);
        this.adapter.on("accountsChanged", this.onAccountsChanged);
        this.adapter.on("error", this.onError);

        // 监听 WalletConnect 显示 URI（移动端可以用作深链接）
        if (typeof this.adapter.on === "function") {
          this.adapter.on("display_uri", (uri) => {
            console.log("WalletConnect display_uri:", uri);
            this.wcUri = uri;
          });
        }

        console.log("WalletConnect Adapter initialized:", this.adapter);
      } catch (error) {
        console.error("Failed to initialize adapter:", error);
        this.error = `初始化失败: ${error.message}`;
      }
    },

    async openWalletModal() {
      if (!this.adapter) {
        this.error = "Adapter not initialized";
        return;
      }

      try {
        this.connecting = true;
        this.error = "";

        console.log("Opening wallet selection modal...");

        if (typeof this.adapter.openModal === "function") {
          await this.adapter.openModal();
        } else if (typeof this.adapter.connect === "function") {
          await this.adapter.connect();
        } else {
          throw new Error("No available method to open wallet selection");
        }
      } catch (error) {
        console.error("Failed to open wallet modal:", error);
        this.error = `打开钱包选择失败: ${error.message}`;
      } finally {
        this.connecting = false;
      }
    },

    async connectWallet() {
      if (!this.adapter) {
        this.error = "Adapter not initialized";
        alert("Adapter not initialized");
        return;
      }

      try {
        this.connecting = true;
        this.error = "";

        console.log("Connecting to wallet...");

        if (this.adapter.connected) {
          await this.adapter.disconnect();
        }

        await this.adapter.connect();

        if (this.adapter.connected) {
          this.onConnect();
        } else {
          throw new Error("连接失败：适配器未报告连接成功");
        }
      } catch (error) {
        console.error("Connection failed:", error);
        let errorMessage = error.message || "未知错误";
        if (errorMessage.includes("User rejected")) {
          errorMessage = "用户取消了连接请求";
        } else if (errorMessage.includes("No wallet")) {
          errorMessage =
            "未找到支持的钱包，请确保已安装TronLink或其他支持Tron的钱包";
        } else if (errorMessage.includes("Network")) {
          errorMessage = "网络连接错误，请检查网络设置";
        }
        this.error = `连接失败: ${errorMessage}`;
      } finally {
        this.connecting = false;
      }
    },

    async disconnectWallet() {
      if (!this.adapter) return;
      try {
        await this.adapter.disconnect();
      } catch (error) {
        console.error("Disconnect failed:", error);
        this.error = `断开连接失败: ${error.message}`;
      }
    },

    async getBalance() {
      if (!this.connected || !this.address) return;
      try {
        const response = await fetch(
          `https://api.trongrid.io/v1/accounts/${this.address}`,
        );
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const balanceInSun = data.data[0].balance || 0;
          this.balance = (balanceInSun / 1_000_000).toFixed(6);
        } else {
          this.balance = "0";
        }
      } catch (error) {
        console.error("Failed to get balance:", error);
        this.error = `获取余额失败: ${error.message}`;
      }
    },

    onConnect() {
      console.log("Wallet connected");
      this.connected = true;
      this.address = this.adapter.address || "";
      this.error = "";
      if (this.address) {
        this.getBalance();
      }
    },

    onDisconnect() {
      console.log("Wallet disconnected");
      this.connected = false;
      this.address = "";
      this.balance = "0";
      this.error = "";
    },

    onAccountsChanged(accounts) {
      console.log("Accounts changed:", accounts);
      if (accounts && accounts.length > 0) {
        this.address = accounts[0];
        this.getBalance();
      }
    },

    onError(error) {
      console.error("Adapter error:", error);
      this.error = `适配器错误: ${error.message || error}`;
    },

    // 移动端：使用 deep link 打开钱包
    openDeepLink() {
      if (!this.wcUri) return;
      const encoded = encodeURIComponent(this.wcUri);
      // 常见钱包的 deeplink 方案（不同钱包支持不同，提供多方案尝试）
      const candidates = [
        `tronlink://wc?uri=${encoded}`,
        `trust://wc?uri=${encoded}`,
        `tpoutside://wc?uri=${encoded}`,
        `walletconnect://wc?uri=${encoded}`,
      ];
      // 依次尝试
      let opened = false;
      for (const url of candidates) {
        try {
          window.location.href = url;
          opened = true;
          break;
        } catch (e) {
          // 忽略，尝试下一个
        }
      }
      if (!opened) {
        // 兜底：直接展示 URI 供复制
        alert("未能自动打开钱包，请点击复制URI后在钱包内粘贴使用");
      }
    },

    async copyUri() {
      if (!this.wcUri) return;
      try {
        await navigator.clipboard.writeText(this.wcUri);
        alert("已复制 WalletConnect URI");
      } catch (e) {
        console.log("Clipboard failed, show prompt");
        prompt("复制以下 WalletConnect URI:", this.wcUri);
      }
    },

    debugAdapter() {
      console.log("=== 适配器调试信息 ===");
      if (this.adapter) {
        console.log("适配器对象:", this.adapter);
        console.log("适配器方法:", Object.getOwnPropertyNames(this.adapter));
        console.log(
          "适配器原型方法:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.adapter)),
        );
        console.log("连接状态:", this.adapter.connected);
        console.log("地址:", this.adapter.address);
        console.log("网络:", this.adapter.network);
        if (typeof this.adapter.openModal === "function") {
          console.log("✅ 支持 openModal 方法");
        } else {
          console.log("❌ 不支持 openModal 方法");
        }
        if (typeof this.adapter.getWallets === "function") {
          console.log("✅ 支持 getWallets 方法");
          try {
            const wallets = this.adapter.getWallets();
            console.log("可用钱包:", wallets);
          } catch (e) {
            console.log("获取钱包列表失败:", e);
          }
        } else {
          console.log("❌ 不支持 getWallets 方法");
        }
      } else {
        console.log("❌ 适配器未初始化");
      }
      console.log("=== 调试信息结束 ===");
    },
  },

  beforeUnmount() {
    if (this.adapter) {
      this.adapter.off("connect", this.onConnect);
      this.adapter.off("disconnect", this.onDisconnect);
      this.adapter.off("accountsChanged", this.onAccountsChanged);
      this.adapter.off("error", this.onError);
      if (typeof this.adapter.off === "function") {
        this.adapter.off("display_uri", () => {});
      }
    }
  },
};
</script>

<style scoped>
.tron-wallet-connect {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.wallet-info {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #eee;
}

.wallet-info p {
  margin: 8px 0;
  word-break: break-all;
}

.error {
  color: #e74c3c;
}

.connecting-info {
  background: #e8f4fd;
  border: 1px solid #3498db;
  border-radius: 6px;
  padding: 10px;
  margin: 10px 0;
}

.connecting-info p {
  margin: 5px 0;
  color: #2980b9;
}

.tip {
  font-size: 12px;
  color: #7f8c8d;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #2980b9;
}

button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.debug-btn {
  background: #9b59b6 !important;
  font-size: 12px;
}

.debug-btn:hover {
  background: #8e44ad !important;
}

.secondary-btn {
  background: #ecf0f1;
  color: #2c3e50;
  border: 1px solid #bdc3c7;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
}

.secondary-btn:hover {
  background: #d5dbdb;
}

.secondary-btn:disabled {
  background: #ecf0f1;
  color: #95a5a6;
  cursor: not-allowed;
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

/* 移动端备选深链接区域 */
.mobile-fallback {
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
}
.mobile-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.open-wallet-btn {
  background: #27ae60;
}
.copy-btn {
  background: #95a5a6;
}
.uri-details {
  margin-top: 8px;
}
.uri-text {
  font-size: 12px;
  word-break: break-all;
}
</style>
