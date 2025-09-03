<!--<template>-->
<!--  <view class="container">-->
<!--    <view class="header">-->
<!--      <h1>Crypto Wallet Connector</h1>-->
<!--      <p>Connect to your wallet and interact with blockchain</p>-->
<!--    </view>-->
<!--    -->
<!--    <view class="wallet-section">-->
<!--      <wallet-connect />-->
<!--      <chain-switcher />-->
<!--    </view>-->
<!--    -->
<!--    <view class="tabs">-->
<!--      <view -->
<!--        class="tab" -->
<!--        :class="{ active: activeTab === 'balance' }"-->
<!--        @click="activeTab = 'balance'"-->
<!--      >-->
<!--        Check Balance-->
<!--      </view>-->
<!--      <view -->
<!--        class="tab" -->
<!--        :class="{ active: activeTab === 'transfer' }"-->
<!--        @click="activeTab = 'transfer'"-->
<!--      >-->
<!--        Transfer Token-->
<!--      </view>-->
<!--      <view -->
<!--        class="tab" -->
<!--        :class="{ active: activeTab === 'approve' }"-->
<!--        @click="activeTab = 'approve'"-->
<!--      >-->
<!--        Approve Token-->
<!--      </view>-->
<!--    </view>-->
<!--    -->
<!--    <view class="tab-content">-->
<!--      <token-balance v-if="activeTab === 'balance'" />-->
<!--      <token-transfer v-if="activeTab === 'transfer'" />-->
<!--      <token-approve v-if="activeTab === 'approve'" />-->
<!--    </view>-->
<!--    -->
<!--    <view class="disclaimer" v-if="connected">-->
<!--      <p>⚠️ Disclaimer: This is a demo application. Use at your own risk.</p>-->
<!--    </view>-->
<!--  </view>-->
<!--</template>-->

<!--<script>-->
<!--import WalletConnect from '../../components/WalletConnect'-->
<!--import ChainSwitcher from '../../components/ChainSwitcher'-->
<!--import TokenBalance from '../../components/TokenBalance'-->
<!--import TokenTransfer from '../../components/TokenTransfer'-->
<!--import TokenApprove from '../../components/TokenApprove'-->
<!--import { mapState } from 'vuex'-->

<!--export default {-->
<!--  components: {-->
<!--    WalletConnect,-->
<!--    ChainSwitcher,-->
<!--    TokenBalance,-->
<!--    TokenTransfer,-->
<!--    TokenApprove-->
<!--  },-->
<!--  data() {-->
<!--    return {-->
<!--      activeTab: 'balance'-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState('wallet', ['connected'])-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style lang="scss">-->
<!--.container {-->
<!--  padding: 20px;-->
<!--  max-width: 800px;-->
<!--  margin: 0 auto;-->
<!--  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;-->
<!--  -->
<!--  .header {-->
<!--    text-align: center;-->
<!--    margin-bottom: 30px;-->
<!--    -->
<!--    h1 {-->
<!--      color: #333;-->
<!--      margin-bottom: 10px;-->
<!--    }-->
<!--    -->
<!--    p {-->
<!--      color: #666;-->
<!--      font-size: 16px;-->
<!--    }-->
<!--  }-->
<!--  -->
<!--  .wallet-section {-->
<!--    background-color: #f9f9f9;-->
<!--    padding: 20px;-->
<!--    border-radius: 8px;-->
<!--    margin-bottom: 20px;-->
<!--    box-shadow: 0 2px 4px rgba(0,0,0,0.1);-->
<!--  }-->
<!--  -->
<!--  .tabs {-->
<!--    display: flex;-->
<!--    border-bottom: 1px solid #ddd;-->
<!--    margin-bottom: 20px;-->
<!--    -->
<!--    .tab {-->
<!--      padding: 10px 20px;-->
<!--      cursor: pointer;-->
<!--      border-bottom: 2px solid transparent;-->
<!--      transition: all 0.3s;-->
