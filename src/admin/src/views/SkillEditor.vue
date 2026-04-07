<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <RouterLink to="/skills" class="text-zinc-500 hover:text-zinc-100 text-sm">← Skills</RouterLink>
        <span class="text-zinc-700">/</span>
        <h1 class="text-lg font-semibold">{{ type }}/{{ name }}</h1>
      </div>
      <div class="flex gap-2">
        <RouterLink to="/skills" class="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5">Cancel</RouterLink>
        <button @click="save" class="text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-3 py-1.5 rounded-md transition-colors">
          Save
        </button>
      </div>
    </div>
    <div class="flex-1 border border-zinc-800 rounded-lg overflow-hidden">
      <Codemirror v-model="content" :extensions="extensions" class="h-full text-sm" />
    </div>
    <div v-if="saved" class="mt-2 text-xs text-cyan-400">✓ Saved</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { Codemirror } from "vue-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

const route = useRoute();
const type = route.params.type as string;
const name = route.params.name as string;
const content = ref("");
const saved = ref(false);
const extensions = [markdown(), oneDark];

onMounted(async () => {
  const data = await fetch(`/api/skills/${type}/${name}`).then(r => r.json());
  content.value = data.content;
});

async function save() {
  await fetch(`/api/skills/${type}/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.value }),
  });
  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}
</script>
