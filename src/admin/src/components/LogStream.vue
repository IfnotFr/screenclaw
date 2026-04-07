<template>
  <div ref="container" class="font-mono text-xs space-y-0.5 overflow-y-auto max-h-96">
    <div v-if="logs.length === 0" class="text-zinc-600">No logs yet.</div>
    <div v-for="(log, i) in displayLogs" :key="i" class="flex gap-2">
      <span class="text-zinc-600 shrink-0">{{ log.time }}</span>
      <span :class="levelColor(log.level)">{{ log.msg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

const props = defineProps<{ max?: number }>();
const container = ref<HTMLElement>();

interface LogEntry { time: string; level: string; msg: string }
const logs = ref<LogEntry[]>([]);

const displayLogs = computed(() =>
  props.max ? logs.value.slice(-props.max) : logs.value
);

function levelColor(level: string) {
  if (level === "error") return "text-red-400";
  if (level === "warn") return "text-yellow-400";
  return "text-zinc-300";
}

let es: EventSource;
onMounted(() => {
  es = new EventSource("/api/events");
  es.onmessage = async (e) => {
    const { type, payload } = JSON.parse(e.data);
    if (type === "log") {
      logs.value.push({ time: new Date().toLocaleTimeString(), level: payload.level, msg: payload.msg });
      await nextTick();
      container.value?.scrollTo({ top: container.value.scrollHeight, behavior: "smooth" });
    }
  };
});
onUnmounted(() => es?.close());
</script>
