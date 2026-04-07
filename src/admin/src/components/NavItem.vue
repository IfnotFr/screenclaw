<template>
  <RouterLink
    :to="to"
    class="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
    :class="{ 'bg-zinc-800 text-zinc-100': isActive }"
  >
    <span class="text-base">{{ icon }}</span>
    {{ label }}
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const props = defineProps<{ to: string; icon: string; label: string }>();
const route = useRoute();
const isActive = computed(() =>
  props.to === "/" ? route.path === "/" : route.path.startsWith(props.to)
);
</script>
