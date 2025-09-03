<template>
  <div id="app">
    <!--    <div style="margin-bottom: 30px">-->
    <!--      <h1 style="text-align: center; margin-bottom: 20px; color: #2c3e50">-->
    <!--        钱包连接测试-->
    <!--      </h1>-->
    <!--      <TronWalletConnect />-->
    <!--    </div>-->

    <div style="border-top: 2px solid #ddd; padding-top: 30px">
      <Walletconnect />
      <!--      <Universal />-->
    </div>

    <!--    <div style="border-top: 2px solid #ddd; padding-top: 30px">-->
    <!--      <TronWalletConnectDirect />-->
    <!--    </div>-->
    <!--    <div style="border-top: 2px solid #ddd; padding-top: 30px;">-->
    <!--      <WalletconnectSui />-->
    <!--    </div>-->
    <!--    <HelloWorld />-->
    <!--    <WalletDashboard />-->
  </div>
</template>

<script setup>
import WalletDashboard from "./components/WalletDashboard.vue";
import HelloWorld from "./components/HelloWorld.vue";
import Walletconnect from "./components/Walletconnect.vue";
import Universal from "./components/Universal.vue";
import TronWalletConnect from "./components/TronWalletConnect.vue";
import TronWalletConnectDirect from "./components/TronWalletConnectDirect.vue";
import WalletconnectSui from "./components/WalletconnectSui.vue";
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #f5f5f5;
}
</style>
