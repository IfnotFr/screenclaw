<template>
  <RouterLink :to="to" class="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors block">
    <div class="text-zinc-500 text-xs mb-1">{{ icon }} {{ label }}</div>
    <div class="text-2xl font-semibold text-zinc-100">{{ value }}</div>
  </RouterLink>
</template>

<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string | number; to: string }>();
</script>
