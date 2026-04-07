<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Skills</h1>

    <div class="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
      <div v-if="skills.length === 0" class="px-4 py-6 text-zinc-500 text-sm text-center">No skills found.</div>
      <div v-for="s in skills" :key="s.id" class="flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition-colors">
        <div>
          <span class="text-sm font-medium text-zinc-200">{{ s.id }}</span>
          <p v-if="s.description" class="text-xs text-zinc-500 mt-0.5">{{ s.description }}</p>
        </div>
        <RouterLink :to="`/skills/${s.id}`" class="text-xs text-cyan-400 hover:underline">Edit</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const skills = ref<{ id: string; description: string }[]>([]);

onMounted(async () => {
  skills.value = await fetch("/api/skills").then(r => r.json());
});
</script>
