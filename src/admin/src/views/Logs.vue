<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Logs</h1>
      <button @click="logs = []" class="text-xs text-zinc-500 hover:text-zinc-100">Clear</button>
    </div>
    <div class="flex-1 border border-zinc-800 rounded-lg p-4 overflow-y-auto">
      <LogStream />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import LogStream from "../components/LogStream.vue";
const logs = ref([]);
</script>
