<template>
  <div id="app">
    <button onclick="window.location.reload();">刷新</button>

    <div
      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"
    />
    <Deeplink />

    <div
      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"
    />
    <TronWalletConnectDirect />

    <div
      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"
    />
    <TronWalletConnect />

    <!--    <div-->
    <!--      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"-->
    <!--    />-->
    <!--    <Walletconnect />-->

    <!--    <div-->
    <!--      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"-->
    <!--    />-->
    <!--    <Test1 />-->

    <!--    <div-->
    <!--      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"-->
    <!--    />-->
    <!--    <Universal />-->

    <!-- <div
      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"
    />
    <TronAppKit /> -->

    <!--    <div-->
    <!--      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"-->
    <!--    />-->
    <!--    <WalletconnectSui />-->

    <!--    <div-->
    <!--      style="border-top: 2px solid #ddd; padding-top: 30px; margin: 10px auto"-->
    <!--    />-->
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
import Test1 from "./components/Test1.vue";
import TronAppKit from "./components/TronAppKit.vue";
import Deeplink from "./components/Deeplink.vue";
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
