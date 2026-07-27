<template>
  <v-app>
    <v-app-bar color="primary" flat>
      <v-app-bar-title>Bibliothèque Physique</v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" :to="{ name: 'browse' }">Parcourir</v-btn>
      <v-btn variant="text" :to="{ name: 'admin' }">Admin</v-btn>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
<script setup lang="ts"></script>
