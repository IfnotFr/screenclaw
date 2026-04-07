<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Dashboard</h1>

    <div class="grid grid-cols-3 gap-4 mb-8">
      <StatCard icon="◈" label="Missions" :value="stats.missions" to="/missions" />
      <StatCard icon="◆" label="Skills" :value="stats.skills" to="/skills" />
      <StatCard icon="⬡" label="Status" :value="schedulerRunning ? 'Running' : 'Idle'" to="/logs" />
    </div>

    <div class="border border-zinc-800 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-zinc-300">Recent logs</h2>
        <RouterLink to="/logs" class="text-xs text-cyan-400 hover:underline">View all →</RouterLink>
      </div>
      <LogStream :max="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import StatCard from "../components/StatCard.vue";
import LogStream from "../components/LogStream.vue";

const stats = ref({ missions: 0, skills: 0 });
const schedulerRunning = ref(false);

onMounted(async () => {
  const [m, s, sc] = await Promise.all([
    fetch("/api/missions").then(r => r.json()),
    fetch("/api/skills").then(r => r.json()),
    fetch("/api/scheduler/status").then(r => r.json()),
  ]);
  stats.value = { missions: m.length, skills: s.length };
  schedulerRunning.value = sc.running;
});
</script>
