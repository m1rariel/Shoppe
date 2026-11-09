<script setup lang="ts">
  interface Section {
    id: string
    label: string
  }
  withDefaults(
    defineProps<{
      sections: Section[]
      modelValue: string | null
      idPrefix: string
      accordion?: boolean
    }>(),
    { accordion: true },
  )
  const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
</script>

<template>
  <div class="base-accordeon" :class="{ 'base-accordeon--tabs': !accordion }">
    <section v-for="section in sections" :key="section.id" class="base-accordeon__section">
      <h2 v-show="accordion" class="base-accordeon__heading">
        <button
          :id="`${idPrefix}-trigger-${section.id}`"
          class="base-accordeon__trigger"
          type="button"
          :aria-expanded="modelValue === section.id"
          :aria-controls="`${idPrefix}-panel-${section.id}`"
          @click="emit('update:modelValue', modelValue === section.id ? null : section.id)"
        >
          {{ section.label }}
          <span class="base-accordeon__chevron" aria-hidden="true" />
        </button>
      </h2>
      <!-- Keep one mounted copy of each slot so drafts survive mode and section changes. -->
      <div
        :id="`${idPrefix}-panel-${section.id}`"
        class="base-accordeon__panel"
        :hidden="modelValue !== section.id"
        :role="accordion ? 'region' : 'tabpanel'"
        :aria-labelledby="`${idPrefix}-${accordion ? 'trigger' : 'tab'}-${section.id}`"
        :tabindex="accordion ? undefined : 0"
      >
        <slot :name="section.id" />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  .base-accordeon__heading {
    margin: 0;
    font-size: inherit;
    font-weight: $font-weight-regular;
  }

  .base-accordeon__trigger {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 29px;
    padding: 0;
    font-size: 12px;
    line-height: 20px;
    text-align: left;
    background: none;
    border: 0;

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 2px;
    }
  }

  .base-accordeon__chevron {
    width: 5px;
    height: 5px;
    margin-right: 2px;
    border-right: 1px solid currentcolor;
    border-bottom: 1px solid currentcolor;
    transform: rotate(-45deg);

    [aria-expanded='true'] & {
      transform: rotate(45deg);
    }
  }

  .base-accordeon__panel {
    padding: 12px 0 20px;
    overflow-wrap: anywhere;

    &[hidden] {
      display: none;
    }
  }

  .base-accordeon--tabs {
    .base-accordeon__panel {
      padding: 39px 0 0;
    }
  }
</style>
