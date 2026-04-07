<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Missions</h1>
      <button @click="showCreate = true" class="text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-3 py-1.5 rounded-md transition-colors">
        + New mission
      </button>
    </div>

    <div class="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
      <div v-if="missions.length === 0" class="px-4 py-6 text-zinc-500 text-sm text-center">No missions yet.</div>
      <div v-for="m in missions" :key="m.id" class="flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors">
        <span class="text-sm font-medium text-zinc-200">{{ m.title }}</span>
        <div class="flex gap-2">
          <RouterLink :to="`/missions/${m.id}`" class="text-xs text-cyan-400 hover:underline">Edit</RouterLink>
          <button @click="deleteMission(m.id)" class="text-xs text-red-400 hover:underline">Delete</button>
        </div>
      </div>
    </div>

    <!-- Create dialog -->
    <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-96">
        <h2 class="text-lg font-semibold mb-4">New mission</h2>
        <input
          v-model="newTitle"
          placeholder="Mission title"
          class="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 mb-4"
          @keyup.enter="createMission"
        />
        <div class="flex gap-2 justify-end">
          <button @click="showCreate = false" class="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5">Cancel</button>
          <button @click="createMission" class="text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-3 py-1.5 rounded-md">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const missions = ref<{ id: string; title: string }[]>([]);
const showCreate = ref(false);
const newTitle = ref("");

async function load() {
  missions.value = await fetch("/api/missions").then(r => r.json());
}

async function createMission() {
  if (!newTitle.value.trim()) return;
  const m = await fetch("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle.value }),
  }).then(r => r.json());
  showCreate.value = false;
  newTitle.value = "";
  router.push(`/missions/${m.id}`);
}

async function deleteMission(id: string) {
  if (!confirm(`Delete mission "${id}"?`)) return;
  await fetch(`/api/missions/${id}`, { method: "DELETE" });
  await load();
}

onMounted(load);
</script>
