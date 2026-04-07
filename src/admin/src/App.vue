<template>
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from "./components/AppSidebar.vue";
</script>
