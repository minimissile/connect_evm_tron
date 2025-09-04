<template>
  <div class="deeplink-wrap">
    <h2>Tron Deep Link 连接（优先支持 TronLink）</h2>

    <div class="status">
      <p><strong>连接状态：</strong>{{ connected ? "已连接" : "未连接" }}</p>
      <p v-if="connected && address"><strong>地址：</strong>{{ address }}</p>
      <p v-if="connected && balance">
        <strong>余额：</strong>{{ balance }} TRX
      </p>
      <p v-if="error" class="error">错误：{{ error }}</p>
    </div>

    <div class="actions">
      <button
        v-if="!connected"
        @click="connect"
        :disabled="connecting || officialLoginPending"
      >
        {{ connecting ? "生成连接中..." : "一键连接 TronLink（Deep Link）" }}
      </button>
      <button
        v-if="!connected && wcUri"
        class="secondary"
        @click="openTronLinkDeepLink"
        :disabled="officialLoginPending"
      >
        打开 TronLink (WC)
      </button>
      <button
        v-if="!connected"
        class="secondary"
        @click="openTronLinkOfficialLogin"
        :disabled="connecting || officialLoginPending"
      >
        {{ officialLoginPending ? "等待钱包返回..." : "TronLink 官方登录" }}
      </button>
      <button
        v-if="!connected"
        class="secondary"
        @click="testOfficialCallback"
        style="background-color: #ff9800; color: white"
      >
        测试回调 (开发用)
      </button>
      <button
        v-if="!connected && wcUri"
        class="secondary"
        @click="copyUri"
        :disabled="officialLoginPending"
      >
        复制 WalletConnect URI
      </button>
      <button v-if="connected" @click="disconnect">断开连接</button>
      <button v-if="connected" class="secondary" @click="getBalance">
        刷新余额
      </button>
    </div>

    <div v-if="!connected && wcUri" class="uri-box">
      <details>
        <summary>显示 WalletConnect URI（手动粘贴到钱包）</summary>
        <p class="mono">{{ wcUri }}</p>
      </details>
      <p class="tip" v-if="isMobile">
        若未自动唤起 TronLink，可尝试"TronLink 官方登录"或复制 URI 后，在
        TronLink App 的 WalletConnect 中粘贴连接。
      </p>
      <p class="tip" v-else>
        当前为桌面环境，请将以下 URI 复制到手机钱包（TronLink ->
        WalletConnect）中进行连接，或使用"TronLink 官方登录"。
      </p>
      <div class="warning-box">
        <p class="warning">
          ⚠️ 注意：根据社区反馈，TronLink 可能从 2023 年 8
          月开始限制第三方深链接。官方深链接需要 DApp
          添加到白名单才能正常使用。如果无法获取回调结果，请使用 WalletConnect
          方式连接。
        </p>
      </div>

      <div v-if="officialLoginPending" class="status-box">
        <p class="status">
          🔄 正在等待 TronLink 钱包返回登录结果，请在钱包中完成操作后返回...
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";

export default {
  name: "Deeplink",
  data() {
    return {
      adapter: null,
      connected: false,
      connecting: false,
      address: "",
      balance: "0",
      error: "",
      wcUri: "",
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      removeDisplayUriListener: null,
      // 官方深链接相关
      officialLoginPending: false,
      currentActionId: null,
      visibilityHandler: null,
      hashChangeHandler: null,
      popstateHandler: null,
    };
  },
  mounted() {
    this.initAdapter();
    this.setupOfficialLoginCallback();
  },
  beforeUnmount() {
    this.teardown();

    this.cleanupOfficialLoginCallback();
  },
  methods: {
    initAdapter() {
      if (this.adapter) return;
      try {
        this.adapter = new WalletConnectAdapter({
          network: "Mainnet",
          options: {
            relayUrl: "wss://relay.walletconnect.com",
            projectId: "c34b3bde7397ea7ed6780e9ce1d5194d",
            metadata: {
              name: "Tron Deeplink Connector",
              description:
                "Connect to Tron via WalletConnect and TronLink deep link",
              url: window.location.origin,
              icons: [window.location.origin + "/favicon.ico"],
            },
          },
        });

        // 基本事件
        this.adapter.on("connect", this.onConnect);
        this.adapter.on("disconnect", this.onDisconnect);
        this.adapter.on("accountsChanged", this.onAccountsChanged);
        this.adapter.on("error", this.onError);

        // display_uri 用于移动端深链接
        if (typeof this.adapter.on === "function") {
          const handler = (uri) => {
            console.log("display_uri", uri);
            this.wcUri = uri;
            // 自动尝试打开 TronLink（仅移动端）
            if (this.isMobile) {
              // 延迟少许，给浏览器时间渲染
              setTimeout(() => this.openTronLinkDeepLink(), 100);
            }
          };
          this.adapter.on("display_uri", handler);
          this.removeDisplayUriListener = () => {
            try {
              this.adapter.off && this.adapter.off("display_uri", handler);
            } catch {}
          };
        }
      } catch (e) {
        console.error("Adapter init failed", e);
        this.error = `初始化失败：${e?.message || e}`;
      }
    },

    teardown() {
      if (!this.adapter) return;
      try {
        this.adapter.off("connect", this.onConnect);
        this.adapter.off("disconnect", this.onDisconnect);
        this.adapter.off("accountsChanged", this.onAccountsChanged);
        this.adapter.off("error", this.onError);
        if (this.removeDisplayUriListener) this.removeDisplayUriListener();
      } catch {}
    },

    async startDeepLinkFlow() {
      this.error = "";
      this.wcUri = "";
      if (!this.adapter) this.initAdapter();
      if (!this.adapter) {
        this.error = "Adapter 初始化失败";
        return;
      }
      try {
        this.connecting = true;
        // 触发连接流程以生成 display_uri
        await this.adapter.connect();
        // 成功连接时，会走 onConnect
      } catch (e) {
        console.error("connect error", e);
        const msg = e?.message || `${e}`;
        if (/User rejected/i.test(msg)) {
          this.error = "用户取消了连接请求";
        } else {
          this.error = `连接失败：${msg}`;
        }
      } finally {
        this.connecting = false;
      }
    },

    openTronLinkDeepLink() {
      if (!this.wcUri) return;
      const encoded = encodeURIComponent(this.wcUri);
      // TronLink Deep Link（常见用法）
      const candidates = [
        `tronlink://wc?uri=${encoded}`,
        // 备用方案：部分环境会注册 walletconnect 通用 scheme
        `walletconnect://wc?uri=${encoded}`,
      ];
      let opened = false;
      for (const url of candidates) {
        try {
          window.location.href = url;
          opened = true;
          break;
        } catch (e) {}
      }
      if (!opened) {
        alert(
          '未能自动打开 TronLink，请点击"复制 WalletConnect URI"后，在 TronLink 的 WalletConnect 中粘贴使用。',
        );
      }
    },

    // 官方 TronLink DeepLink 登录方式
    openTronLinkOfficialLogin() {
      this.currentActionId = this.generateActionId();
      this.officialLoginPending = true;
      this.error = "";

      const param = {
        // 使用完整地址，确保包含 hash 路由，以便钱包回跳时能正确携带参数
        url: window.location.href,
        // 将回调也指向当前页面（多数钱包将结果附带到 url 打开 DApp 内置浏览器，而不是发起后端回调）
        callbackUrl: window.location.href,
        dappIcon: window.location.origin + "/favicon.ico",
        dappName: "Tron Deeplink Connector",
        protocol: "TronLink",
        version: "1.0",
        chainId: "0x2b6653dc", // TRON 主网
        action: "login",
        actionId: this.currentActionId,
      };

      const encodedParam = encodeURIComponent(JSON.stringify(param));
      const deepLinkUrl = `tronlinkoutside://pull.activity?param=${encodedParam}`;

      try {
        window.location.href = deepLinkUrl;
        // 设置超时，如果用户没有返回则取消等待状态
        setTimeout(() => {
          if (this.officialLoginPending) {
            this.officialLoginPending = false;
            console.log("Official login timeout");
          }
        }, 30000); // 30秒超时
      } catch (e) {
        console.error("Failed to open TronLink official deeplink:", e);
        this.officialLoginPending = false;
        alert(
          "无法打开 TronLink 官方深链接，请确保已安装 TronLink App 并已添加到白名单。",
        );
      }
    },

    generateActionId() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    },

    // 设置官方深链接回调监听
    setupOfficialLoginCallback() {
      // 监听页面可见性变化（用户从钱包返回时触发）
      this.visibilityHandler = () => {
        if (
          document.visibilityState === "visible" &&
          this.officialLoginPending
        ) {
          console.log("Page became visible, checking for callback results...");
          // 延迟检查，给页面时间更新 URL
          setTimeout(() => {
            this.checkOfficialLoginResult();
          }, 500);
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);

      // 监听 hashchange 事件（某些情况下回调可能通过 hash 传递）
      this.hashChangeHandler = () => {
        if (this.officialLoginPending) {
          console.log("Hash changed, checking for callback results...");
          this.checkOfficialLoginResult();
        }
      };
      window.addEventListener("hashchange", this.hashChangeHandler);

      // 监听 popstate 事件
      this.popstateHandler = () => {
        if (this.officialLoginPending) {
          console.log("Popstate event, checking for callback results...");
          setTimeout(() => {
            this.checkOfficialLoginResult();
          }, 100);
        }
      };
      window.addEventListener("popstate", this.popstateHandler);

      // 检查当前 URL 是否包含登录结果
      this.checkOfficialLoginResult();
    },

    // 清理官方深链接回调监听
    cleanupOfficialLoginCallback() {
      if (this.visibilityHandler) {
        document.removeEventListener(
          "visibilitychange",
          this.visibilityHandler,
        );
        this.visibilityHandler = null;
      }
      if (this.hashChangeHandler) {
        window.removeEventListener("hashchange", this.hashChangeHandler);
        this.hashChangeHandler = null;
      }
      if (this.popstateHandler) {
        window.removeEventListener("popstate", this.popstateHandler);
        this.popstateHandler = null;
      }
    },

    // 检查官方深链接登录结果
    checkOfficialLoginResult() {
      try {
        // 1) 解析 search 参数
        const searchParams = new URLSearchParams(window.location.search);
        // 2) 解析 hash 内的查询参数（形如 #/path?key=value）
        let hashQueryParams = new URLSearchParams();
        if (window.location.hash) {
          const hash = window.location.hash; // e.g. #/home?code=0&actionId=xxx
          const idx = hash.indexOf("?");
          if (idx !== -1) {
            hashQueryParams = new URLSearchParams(hash.substring(idx + 1));
          }
        }

        // 优先使用 search，其次使用 hash
        const getParam = (key) =>
          searchParams.get(key) !== null
            ? searchParams.get(key)
            : hashQueryParams.get(key);

        const actionId = getParam("actionId");
        const code = getParam("code");
        const message = getParam("message");
        const address = getParam("address");
        const loginAddress = getParam("loginAddress");

        console.log("Checking Deeplink callback params:", {
          actionId,
          code,
          message,
          address,
          loginAddress,
          currentActionId: this.currentActionId,
          pending: this.officialLoginPending,
          href: window.location.href,
        });

        // 如果没有任何 code / actionId，则认为没有回调
        if (code === null && actionId === null) return;

        // 命中当前会话：优先匹配 actionId
        const matchedCurrent =
          !!actionId &&
          this.currentActionId &&
          actionId === this.currentActionId;

        // 在钱包内置浏览器中重新打开页面的场景：没有本地 actionId，但带有有效的回调参数
        const canAcceptWithoutMatch =
          !this.currentActionId && (code !== null || loginAddress || address);

        if (matchedCurrent || canAcceptWithoutMatch) {
          // 一旦检测到回调就结束等待
          if (this.officialLoginPending) this.officialLoginPending = false;

          if (code === "0" || code === 0) {
            const userAddress = loginAddress || address;
            if (userAddress) {
              this.connected = true;
              this.address = userAddress;
              this.error = "";
              console.log("Official login success:", {
                address: userAddress,
                message,
              });
              // 获取余额（修正 fetchBalance -> getBalance）
              this.getBalance();
              // 清理参数
              this.cleanupUrlParams();
            } else {
              this.error = "登录成功但未获取到地址";
              console.warn("Login success but no address received");
            }
          } else {
            // 登录失败/取消
            this.error = message || "登录失败";
            console.warn("Official login failed:", { code, message });
            // 清理参数，避免反复检测
            this.cleanupUrlParams();
          }
        }
      } catch (e) {
        console.error("Error checking official login result:", e);
      }
    },

    // 清理 URL 参数
    cleanupUrlParams() {
      const url = new URL(window.location);
      // 清理 search 上的参数
      [
        "actionId",
        "code",
        "message",
        "address",
        "loginAddress",
        "signature",
        "signedData",
      ].forEach((k) => url.searchParams.delete(k));

      // 清理 hash 上的参数（保留 hash 路径部分）
      if (url.hash) {
        const hash = url.hash; // e.g. #/home?code=0&actionId=xxx
        const qIndex = hash.indexOf("?");
        if (qIndex !== -1) {
          const hashPath = hash.substring(0, qIndex); // #/home
          const hq = new URLSearchParams(hash.substring(qIndex + 1));
          [
            "actionId",
            "code",
            "message",
            "address",
            "loginAddress",
            "signature",
            "signedData",
          ].forEach((k) => hq.delete(k));
          const newHashQuery = hq.toString();
          url.hash = newHashQuery ? `${hashPath}?${newHashQuery}` : hashPath;
        }
      }

      window.history.replaceState({}, document.title, url.toString());
    },

    // 测试官方回调功能（开发用）
    testOfficialCallback() {
      console.log("测试官方回调功能", window.location);

      if (!this.currentActionId) {
        this.currentActionId = this.generateActionId();
        this.officialLoginPending = true;
      }

      // 模拟成功回调参数
      const testParams = {
        actionId: this.currentActionId,
        code: "0",
        message: "success",
        loginAddress: "TTestAddress1234567890123456789012345",
      };

      // 添加参数到 URL
      const url = new URL(window.location);
      Object.keys(testParams).forEach((key) => {
        url.searchParams.set(key, testParams[key]);
      });

      // 更新 URL 并触发检查
      window.history.replaceState({}, document.title, url.toString());

      // 延迟检查，模拟真实场景
      setTimeout(() => {
        this.checkOfficialLoginResult();
      }, 100);
    },

    async copyUri() {
      if (!this.wcUri) return;
      try {
        await navigator.clipboard.writeText(this.wcUri);
        alert("已复制 WalletConnect URI");
      } catch (e) {
        prompt("复制以下 WalletConnect URI：", this.wcUri);
      }
    },

    async disconnect() {
      // 如果是官方深链接连接，直接重置状态
      if (this.connected && !this.adapter?.connected) {
        this.connected = false;
        this.address = "";
        this.balance = "0";
        this.error = "";
        this.officialLoginPending = false;
        this.currentActionId = null;
        return;
      }

      // WalletConnect 断开连接
      if (!this.adapter) return;
      try {
        await this.adapter.disconnect();
      } catch (e) {
        console.error("disconnect failed", e);
      }
    },

    async getBalance() {
      if (!this.connected || !this.address) return;
      try {
        const res = await fetch(
          `https://api.trongrid.io/v1/accounts/${this.address}`,
        );
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const balanceInSun = data.data[0].balance || 0;
          this.balance = (balanceInSun / 1_000_000).toFixed(6);
        } else {
          this.balance = "0";
        }
      } catch (e) {
        console.error("get balance failed", e);
        this.error = `获取余额失败：${e?.message || e}`;
      }
    },

    onConnect() {
      console.log("connected");
      this.connected = true;
      this.error = "";
      this.address = this.adapter?.address || "";
      if (this.address) this.getBalance();
    },

    onDisconnect() {
      console.log("disconnected");
      this.connected = false;
      this.address = "";
      this.balance = "0";
      this.error = "";
    },

    onAccountsChanged(accounts) {
      if (accounts && accounts.length > 0) {
        this.address = accounts[0];
        this.getBalance();
      }
    },

    onError(err) {
      console.error("adapter error", err);
      this.error = `适配器错误：${err?.message || err}`;
    },
  },
};
</script>

<style scoped>
.deeplink-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 10px;
}

h2 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.status {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.error {
  color: #e74c3c;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
}

button:hover {
  background: #2980b9;
}

button.secondary {
  background: #ecf0f1;
  color: #2c3e50;
  border: 1px solid #bdc3c7;
}

.uri-box {
  margin-top: 12px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.mono {
  word-break: break-all;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 12px;
}

.tip {
  font-size: 12px;
  color: #7f8c8d;
}

.warning-box {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 12px;
  margin-top: 15px;
}

.warning {
  color: #856404;
  font-size: 0.85em;
  margin: 0;
  line-height: 1.4;
}

.status-box {
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 6px;
  padding: 12px;
  margin-top: 15px;
}

.status {
  color: #1565c0;
  font-size: 0.85em;
  margin: 0;
  line-height: 1.4;
}
</style>
