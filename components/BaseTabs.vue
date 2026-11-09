<script setup lang="ts">
  interface Section {
    id: string
    label: string
  }
  const props = defineProps<{
    sections: Section[]
    modelValue: string
    idPrefix: string
    label: string
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  function onKeydown(event: KeyboardEvent, index: number) {
    const last = props.sections.length - 1
    const positions: Record<string, number> = {
      ArrowRight: (index + 1) % props.sections.length,
      ArrowLeft: (index + last) % props.sections.length,
      Home: 0,
      End: last,
    }
    const next = positions[event.key]
    if (next === undefined || !props.sections[next]) return
    event.preventDefault()
    emit('update:modelValue', props.sections[next].id)
    const button = event.currentTarget as HTMLButtonElement
    button.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
</script>

<template>
  <div class="base-tabs" role="tablist" :aria-label="label">
    <button
      v-for="(section, index) in sections"
      :id="`${idPrefix}-tab-${section.id}`"
      :key="section.id"
      class="base-tabs__tab"
      type="button"
      role="tab"
      :aria-selected="modelValue === section.id"
      :aria-controls="`${idPrefix}-panel-${section.id}`"
      :tabindex="modelValue === section.id ? 0 : -1"
      @click="emit('update:modelValue', section.id)"
      @keydown="onKeydown($event, index)"
    >
      {{ section.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
  .base-tabs {
    display: flex;
    gap: 96px;
    border-bottom: 1px solid $color-gray;

    @media (width < $breakpoints-l) {
      gap: 48px;
    }
  }

  .base-tabs__tab {
    padding: 0 0 33px;
    margin-bottom: -1px;
    font-size: 20px;
    line-height: 26px;
    color: $color-dark-gray;
    text-align: left;
    background: none;
    border: 0;
    border-bottom: 1px solid transparent;

    &[aria-selected='true'] {
      color: $color-black;
      border-bottom-color: $color-black;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 4px;
    }
  }
</style>
