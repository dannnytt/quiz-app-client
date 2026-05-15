<template>
  <div class="bg-animation">
    <div class="circle"></div><div class="circle"></div><div class="circle"></div>
  </div>

  <div class="container">
    <header class="header">
      <h1>QuizMaster</h1>
    </header>
    <router-view />
  </div>

  <transition-group name="toast" tag="div" class="toast-wrapper">
    <div v-for="t in toasts" :key="t.id" :class="['toast', t.type]">
      {{ t.message }}
    </div>
  </transition-group>
</template>

<script setup>
import { useToast } from './composables/useToast'
const { toasts } = useToast()
</script>
