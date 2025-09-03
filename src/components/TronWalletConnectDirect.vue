<template>
  <div class="tron-wallet-connect-direct">
    <h2>Tron WalletConnect 直接连接测试</h2>
    <div class="wallet-info">
      <p><strong>连接状态:</strong> {{ connected ? "已连接" : "未连接" }}</p>
      <p v-if="connected"><strong>地址:</strong> {{ address }}</p>
      <p v-if="connected"><strong>余额:</strong> {{ balance }} TRX</p>
      <p v-if="error" class="error"><strong>错误:</strong> {{ error }}</p>
      <div v-if="connecting" class="connecting-info">
        <p>🔄 正在连接钱包...</p>
        <p class="tip">💡 提示：将显示二维码或钱包选择界面</p>
      </div>
    </div>

    <div class="actions">
      <button v-if="!connected" @click="connectWallet" :disabled="connecting">
        {{ connecting ? "连接中..." : "连接钱包" }}
      </button>
      <button v-if="connected" @click="disconnectWallet">断开连接</button>
      <button v-if="connected" @click="getBalance">刷新余额</button>
      <button @click="checkStatus">检查状态</button>
    </div>
  </div>
</template>

<script>
import {
  WalletConnectWallet,
  WalletConnectChainID,
} from "@tronweb3/walletconnect-tron";

export default {
  name: "TronWalletConnectDirect",
  data() {
    return {
      wallet: null,
      connected: false,
      connecting: false,
      address: "",
      balance: "0",
      error: "",
    };
  },
  mounted() {
    this.initializeWallet();
  },
  methods: {
    initializeWallet() {
      try {
        this.wallet = new WalletConnectWallet({
          network: WalletConnectChainID.Mainnet,
          options: {
            relayUrl: "wss://relay.walletconnect.com",
            projectId: "c34b3bde7397ea7ed6780e9ce1d5194d", // 示例项目ID
            metadata: {
              name: "Tron Wallet Test Direct",
              description: "Testing Tron WalletConnect Direct",
              url: "http://192.168.31.169:5173",
              icons: ["http://192.168.31.169:5173/favicon.ico"],
            },
          },
          web3ModalConfig: {
            themeMode: "light",
            themeVariables: {
              "--w3m-z-index": "1000",
              "--w3m-accent-color": "#ff6b35",
              "--w3m-background-color": "#ffffff",
            },
            explorerRecommendedWalletIds: [
              "225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f", // TronLink
              "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Trust Wallet
              "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // TokenPocket
            ],
            enableExplorer: true,
            enableNetworkView: true,
            enableAccountView: true,
          },
        });

        console.log("WalletConnect Wallet initialized:", this.wallet);
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
        this.error = `初始化失败: ${error.message}`;
      }
    },

    async connectWallet() {
      if (!this.wallet) {
        this.error = "Wallet not initialized";
        return;
      }

      try {
        this.connecting = true;
        this.error = "";

        console.log("Connecting to wallet...");

        // 使用WalletConnectWallet的connect方法
        const result = await this.wallet.connect();

        if (result && result.address) {
          this.connected = true;
          this.address = result.address;
          console.log("Connection successful! Address:", this.address);
          await this.getBalance();
        } else {
          throw new Error("连接失败：未获取到地址");
        }
      } catch (error) {
        console.error("Connection failed:", error);

        let errorMessage = error.message || "未知错误";
        if (errorMessage.includes("User rejected")) {
          errorMessage = "用户取消了连接请求";
        } else if (errorMessage.includes("No wallet")) {
          errorMessage = "未找到支持的钱包";
        } else if (errorMessage.includes("Network")) {
          errorMessage = "网络连接错误";
        }

        this.error = `连接失败: ${errorMessage}`;
      } finally {
        this.connecting = false;
      }
    },

    async disconnectWallet() {
      if (!this.wallet) return;

      try {
        await this.wallet.disconnect();
        this.connected = false;
        this.address = "";
        this.balance = "0";
        this.error = "";
        console.log("Disconnected successfully");
      } catch (error) {
        console.error("Disconnect failed:", error);
        this.error = `断开连接失败: ${error.message}`;
      }
    },

    async getBalance() {
      if (!this.address) return;

      try {
        const response = await fetch(
          `https://api.trongrid.io/v1/accounts/${this.address}`,
        );
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          const account = data.data[0];
          const balanceInSun = account.balance || 0;
          this.balance = (balanceInSun / 1000000).toFixed(6); // 转换为TRX
        } else {
          this.balance = "0";
        }
      } catch (error) {
        console.error("Failed to get balance:", error);
        this.error = `获取余额失败: ${error.message}`;
      }
    },

    async checkStatus() {
      if (!this.wallet) {
        console.log("❌ 钱包未初始化");
        return;
      }

      try {
        console.log("=== 钱包状态检查 ===");
        console.log("钱包对象:", this.wallet);
        console.log("钱包方法:", Object.getOwnPropertyNames(this.wallet));

        // 检查连接状态
        const status = await this.wallet.checkConnectStatus();
        console.log("连接状态检查结果:", status);

        if (status && status.address) {
          this.connected = true;
          this.address = status.address;
          console.log("✅ 已连接，地址:", this.address);
          await this.getBalance();
        } else {
          this.connected = false;
          this.address = "";
          this.balance = "0";
          console.log("❌ 未连接");
        }

        console.log("=== 状态检查结束 ===");
      } catch (error) {
        console.error("状态检查失败:", error);
        this.error = `状态检查失败: ${error.message}`;
      }
    },
  },
};
</script>

<style scoped>
.tron-wallet-connect-direct {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f0f8ff;
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

.tip {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions button {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.actions button:hover {
  background: #2980b9;
}

.actions button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

h2 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 20px;
}
</style>
