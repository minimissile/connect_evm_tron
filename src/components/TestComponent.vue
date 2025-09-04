<template>
  <div class="test-component">
    <h2>测试组件</h2>
    <p>这是一个用于测试的 Vue 组件。</p>
    <button @click="incrementCount">点击计数: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);

const incrementCount = () => {
  count.value++;
};
</script>

<style scoped>
.test-component {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-width: 400px;
  margin: 20px auto;
}

button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3aa876;
}
</style>