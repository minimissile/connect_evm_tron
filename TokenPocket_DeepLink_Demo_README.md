# TokenPocket DeepLink 钱包交互演示

基于 TokenPocket 官方 DeepLink 协议的完整钱包交互演示项目。

## 项目概述

本演示展示了如何使用 TokenPocket DeepLink 方式实现钱包登录、授权、转账、签名等功能，适用于运行在手机系统浏览器的 H5 应用。

## 核心特性

### 🔐 登录授权
- 支持多链网络（Ethereum、Tron、BSC、Polygon）
- 自定义 DApp 信息（名称、图标、回调 URL）
- 完整的授权流程和状态管理

### 💸 转账功能
- 支持原生代币和 ERC20/TRC20 代币转账
- 自定义转账金额、接收地址、备注信息
- 支持合约地址和代币精度配置

### ✍️ 消息签名
- 支持多种签名类型（ETH Personal Sign、ETH Sign、Tron Sign）
- 自定义签名消息内容
- 完整的签名结果处理

### 📝 交易签名
- 支持原始交易数据签名
- JSON 格式交易数据输入
- 完整的交易签名流程

### 🔄 回调处理
- 自动检测钱包操作结果
- 支持 URL 参数和 Hash 参数解析
- 完整的错误处理和状态反馈

## 技术实现

### DeepLink 协议

基于 TokenPocket 官方 DeepLink 协议：

```
tpoutside://pull.activity?param={encodeURIComponent(JSON.stringify(params))}
```

### 支持的操作类型

1. **登录授权** (`action: "login"`)
2. **转账** (`action: "transfer"`)
3. **消息签名** (`action: "sign"`)
4. **交易签名** (`action: "pushTransaction"`)
5. **打开 DApp** (`tpdapp://open?params={}`)

### 网络支持

- **Ethereum**: `{ chainId: "1", network: "ethereum" }`
- **Tron**: `{ chainId: "1", network: "tron" }`
- **BSC**: `{ chainId: "56", network: "bsc" }`
- **Polygon**: `{ chainId: "137", network: "polygon" }`

## 使用指南

### 1. 登录授权

```javascript
const loginParams = {
  action: "login",
  actionId: "web-" + Date.now(),
  blockchains: [{ chainId: "1", network: "ethereum" }],
  dappIcon: "https://your-dapp.com/icon.png",
  dappName: "Your DApp Name",
  protocol: "TokenPocket",
  callbackUrl: "https://your-dapp.com/callback",
  version: "2.0"
}

const deepLinkUrl = `tpoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(loginParams))}`
window.location.href = deepLinkUrl
```

### 2. 转账操作

```javascript
const transferParams = {
  action: "transfer",
  actionId: "web-" + Date.now(),
  amount: 0.1,
  to: "0x34018569ee4d68a275909cc2538ff67a742f41c8",
  symbol: "ETH",
  decimal: 18,
  precision: 0,
  from: "0x12F4900A1fB41f751b8F616832643224606B75B4",
  memo: "Transfer demo",
  blockchains: [{ chainId: "1", network: "ethereum" }],
  dappIcon: "https://your-dapp.com/icon.png",
  dappName: "Your DApp Name",
  protocol: "TokenPocket",
  callbackUrl: "https://your-dapp.com/callback",
  version: "2.0"
}
```

### 3. 消息签名

```javascript
const signParams = {
  action: "sign",
  actionId: "web-" + Date.now(),
  message: "Hello TokenPocket!",
  signType: "ethPersonalSign",
  hash: false,
  memo: "Message signing demo",
  blockchains: [{ chainId: "1", network: "ethereum" }],
  dappIcon: "https://your-dapp.com/icon.png",
  dappName: "Your DApp Name",
  protocol: "TokenPocket",
  callbackUrl: "https://your-dapp.com/callback",
  version: "2.0"
}
```

### 4. 交易签名

```javascript
const transactionParams = {
  action: "pushTransaction",
  actionId: "web-" + Date.now(),
  txData: JSON.stringify({
    from: "0x12F4900A1fB41f751b8F616832643224606B75B4",
    gasPrice: "0x6c088e200",
    gas: "0xea60",
    chainId: "1",
    to: "0x1d1e7fb353be75669c53c18ded2abcb8c4793d80",
    data: "0xa9059cbb..."
  }),
  blockchains: [{ chainId: "1", network: "ethereum" }],
  dappIcon: "https://your-dapp.com/icon.png",
  dappName: "Your DApp Name",
  protocol: "TokenPocket",
  callbackUrl: "https://your-dapp.com/callback",
  version: "2.0"
}
```

## 回调处理

### 回调参数

TokenPocket 会通过 `callbackUrl` 返回操作结果：

```javascript
// 成功回调
{
  code: 0,           // 0 表示成功
  message: "success",
  address: "0x...",  // 钱包地址（登录时）
  signature: "0x...", // 签名结果（签名时）
  txHash: "0x...",   // 交易哈希（交易时）
  actionId: "web-..."
}

// 失败回调
{
  code: 1,           // 非 0 表示失败
  message: "User cancelled",
  actionId: "web-..."
}
```

### 回调检测

```javascript
// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    checkCallbackParams()
  }
})

// 检查 URL 参数
function checkCallbackParams() {
  const urlParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  
  const code = urlParams.get('code') || hashParams.get('code')
  const message = urlParams.get('message') || hashParams.get('message')
  const address = urlParams.get('address') || hashParams.get('address')
  
  if (code !== null) {
    handleCallbackResult({ code: parseInt(code), message, address })
  }
}
```

## 错误处理

### 常见错误类型

1. **钱包未安装**: 用户设备未安装 TokenPocket 应用
2. **用户取消**: 用户在钱包中取消了操作
3. **网络错误**: 网络连接问题或节点错误
4. **参数错误**: DeepLink 参数格式错误
5. **余额不足**: 转账时余额不足

### 错误处理策略

```javascript
function handleError(error) {
  switch (error.code) {
    case 1:
      console.log('用户取消操作')
      break
    case 2:
      console.log('网络错误')
      break
    case 3:
      console.log('余额不足')
      break
    default:
      console.log('未知错误:', error.message)
  }
}
```

## 最佳实践

### 1. 用户体验优化

- 提供清晰的操作指引
- 显示操作进度和状态
- 处理钱包未安装的情况
- 提供操作超时检测

### 2. 安全考虑

- 验证回调参数的有效性
- 使用 HTTPS 协议
- 不在 URL 中传递敏感信息
- 实现操作确认机制

### 3. 兼容性处理

- 检测设备类型（移动端/桌面端）
- 提供备用连接方式
- 处理不同浏览器的兼容性

## 部署配置

### 1. 回调 URL 配置

```javascript
// 开发环境
const callbackUrl = 'http://localhost:3000/callback'

// 生产环境
const callbackUrl = 'https://your-dapp.com/callback'
```

### 2. HTTPS 要求

生产环境必须使用 HTTPS 协议，确保 DeepLink 正常工作。

### 3. 域名白名单

某些钱包可能需要将域名添加到白名单，请联系 TokenPocket 官方。

## 测试指南

### 1. 本地测试

1. 在移动设备上安装 TokenPocket 应用
2. 使用移动设备浏览器访问演示页面
3. 点击相应功能按钮测试

### 2. 真机测试

1. 部署到 HTTPS 服务器
2. 使用真实的回调 URL
3. 测试完整的操作流程

### 3. 调试技巧

- 使用浏览器开发者工具查看控制台日志
- 检查 URL 参数变化
- 监控网络请求

## 常见问题

### Q: DeepLink 无法打开钱包？
A: 确保设备已安装 TokenPocket 应用，且在移动端浏览器中测试。

### Q: 回调参数获取不到？
A: 检查 callbackUrl 配置是否正确，确保使用 HTTPS 协议。

### Q: 签名失败？
A: 检查签名类型和消息格式是否正确，确保网络配置匹配。

### Q: 转账失败？
A: 检查余额是否足够，合约地址是否正确，网络是否匹配。

## 扩展开发

### 1. 自定义回调处理

```javascript
class TokenPocketHandler {
  constructor(config) {
    this.config = config
    this.setupCallbackListener()
  }
  
  setupCallbackListener() {
    // 自定义回调监听逻辑
  }
  
  async login() {
    // 自定义登录逻辑
  }
  
  async transfer(params) {
    // 自定义转账逻辑
  }
}
```

### 2. 多钱包支持

```javascript
const walletHandlers = {
  tokenpocket: new TokenPocketHandler(),
  metamask: new MetaMaskHandler(),
  trustwallet: new TrustWalletHandler()
}
```

## 相关资源

- [TokenPocket 官方文档](https://help.tokenpocket.pro/developer-cn/mobile-wallet/deeplink)
- [TokenPocket SDK](https://github.com/TP-Lab/tp-wallet-sdk)
- [DeepLink 协议规范](https://help.tokenpocket.pro/developer-cn/mobile-wallet/deeplink)
- [移动端钱包集成指南](https://help.tokenpocket.pro/developer-cn/)

## 许可证

MIT License

---

**注意**: 本演示仅用于学习和测试目的，生产环境使用前请充分测试所有功能并确保安全性。