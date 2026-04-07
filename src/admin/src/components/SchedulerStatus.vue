<template>
  <div class="px-2 py-3 rounded-md border border-zinc-800 text-xs">
    <div class="flex items-center gap-2 mb-1">
      <span class="size-2 rounded-full" :class="running ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'" />
      <span class="text-zinc-300 font-medium">{{ running ? "Running" : "Idle" }}</span>
    </div>
    <div v-if="lastRun" class="text-zinc-500">Last: {{ lastRunRelative }}</div>
    <button
      @click="triggerRun"
      :disabled="running"
      class="mt-2 w-full text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded transition-colors"
    >
      ▶ Run now
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const running = ref(false);
const lastRun = ref<string | null>(null);

const lastRunRelative = computed(() => {
  if (!lastRun.value) return null;
  const diff = Date.now() - new Date(lastRun.value).getTime();
  const m = Math.floor(diff / 60000);
  return m < 1 ? "just now" : `${m}m ago`;
});

async function fetchStatus() {
  const r = await fetch("/api/scheduler/status");
  const data = await r.json();
  running.value = data.running;
  lastRun.value = data.lastRun;
}

async function triggerRun() {
  await fetch("/api/scheduler/run", { method: "POST" });
}

let es: EventSource;
onMounted(() => {
  fetchStatus();
  es = new EventSource("/api/events");
  es.onmessage = (e) => {
    const { type, payload } = JSON.parse(e.data);
    if (type === "scheduler:start") running.value = true;
    if (type === "scheduler:complete") { running.value = false; lastRun.value = new Date().toISOString(); }
    if (type === "scheduler:error") running.value = false;
  };
});
onUnmounted(() => es?.close());
</script>
