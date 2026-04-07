<template>
  <aside class="w-52 shrink-0 border-r border-zinc-800 flex flex-col py-6 px-4 gap-1">
    <div class="text-cyan-400 font-bold text-sm tracking-widest uppercase mb-6 px-2">screen-claw</div>

    <NavItem to="/" icon="⬡" label="Dashboard" />
    <NavItem to="/missions" icon="◈" label="Missions" />
    <NavItem to="/skills" icon="◆" label="Skills" />
    <NavItem to="/logs" icon="≡" label="Logs" />

    <div class="mt-auto">
      <SchedulerStatus />
    </div>
  </aside>
</template>

<script setup lang="ts">
import NavItem from "./NavItem.vue";
import SchedulerStatus from "./SchedulerStatus.vue";
</script>
