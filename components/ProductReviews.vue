<script setup lang="ts">
  import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
  import type { ProductReview, ReviewAuthor, ReviewDraft } from '~/types/reviews'
  import { reviewErrors } from '~/utils/productReviews'

  const props = defineProps<{
    productTitle: string
    reviews: ProductReview[]
    author: ReviewAuthor | null
    error: string
    authorError: string
    save: (draft: ReviewDraft) => boolean
    updateAuthor: (author: ReviewAuthor | null) => boolean
  }>()
  const prefix = `review-${useId()}`
  const draft = reactive<ReviewDraft>({ name: '', email: '', rating: 0, text: '' })
  const remember = ref(false)
  const attempted = ref(false)
  const success = ref(false)
  const form = ref<HTMLFormElement | null>(null)
  const errors = computed(() => reviewErrors(draft))
  let authorEdited = false
  watch(
    () => props.author,
    (author) => {
      if (authorEdited || !author) return
      draft.name = author.name
      draft.email = author.email
      remember.value = true
    },
    { immediate: true },
  )
  function editAuthor(field: 'name' | 'email', value: string) {
    authorEdited = true
    draft[field] = value
    if (remember.value) props.updateAuthor({ name: draft.name.trim(), email: draft.email.trim() })
  }
  function toggleRemember(event: Event) {
    authorEdited = true
    const target = event.target as HTMLInputElement
    if (
      props.updateAuthor(
        target.checked ? { name: draft.name.trim(), email: draft.email.trim() } : null,
      )
    ) {
      remember.value = target.checked
    }
    target.checked = remember.value
  }
  async function submit() {
    attempted.value = true
    success.value = false
    if (Object.values(errors.value).some(Boolean)) {
      await nextTick()
      form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    if (
      remember.value &&
      !props.updateAuthor({ name: draft.name.trim(), email: draft.email.trim() })
    )
      return
    if (!props.save({ ...draft })) return
    draft.text = ''
    draft.rating = 0
    if (!remember.value) {
      draft.name = ''
      draft.email = ''
    }
    attempted.value = false
    success.value = true
  }
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(date))
</script>

<template>
  <div class="product-reviews">
    <section class="product-reviews__list" :aria-labelledby="`${prefix}-heading`">
      <h2 :id="`${prefix}-heading`">
        {{ reviews.length }} {{ reviews.length === 1 ? 'Review' : 'Reviews' }} for
        {{ productTitle }}
      </h2>
      <p class="product-reviews__disclosure">
        Reviews are saved only in this browser on this device.
      </p>
      <p v-if="error" role="alert" class="product-reviews__error">{{ error }}</p>
      <p v-if="!reviews.length">
        {{ error ? 'Saved reviews are currently unavailable.' : 'There are no reviews yet.' }}
      </p>
      <article v-for="review in reviews" :key="review.id" class="product-reviews__review">
        <header>
          <h3>{{ review.name }}</h3>
          <time :datetime="review.createdAt">{{ formatDate(review.createdAt) }}</time>
        </header>
        <p
          class="product-reviews__stars"
          role="img"
          :aria-label="`${review.rating} out of 5 stars`"
        >
          <span aria-hidden="true"
            >{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span
          >
        </p>
        <p class="product-reviews__text">{{ review.text }}</p>
      </article>
    </section>
    <form ref="form" class="product-reviews__form" novalidate @submit.prevent="submit">
      <h2>Add a Review</h2>
      <p>Your email address will not be published. Required fields are marked *</p>
      <div class="product-reviews__field">
        <label :for="`${prefix}-text`">Your Review*</label>
        <textarea
          :id="`${prefix}-text`"
          v-model="draft.text"
          name="text"
          rows="3"
          required
          :aria-invalid="attempted && !!errors.text"
          :aria-describedby="attempted && errors.text ? `${prefix}-text-error` : undefined"
        />
        <p
          v-if="attempted && errors.text"
          :id="`${prefix}-text-error`"
          class="product-reviews__error"
        >
          {{ errors.text }}
        </p>
      </div>
      <div v-for="field in ['name', 'email'] as const" :key="field" class="product-reviews__field">
        <label :for="`${prefix}-${field}`">{{
          field === 'name' ? 'Enter your name*' : 'Enter your Email*'
        }}</label>
        <input
          :id="`${prefix}-${field}`"
          :value="draft[field]"
          :name="field"
          :type="field === 'email' ? 'email' : 'text'"
          :autocomplete="field"
          required
          :aria-invalid="attempted && !!errors[field]"
          :aria-describedby="attempted && errors[field] ? `${prefix}-${field}-error` : undefined"
          @input="editAuthor(field, ($event.target as HTMLInputElement).value)"
        />
        <p
          v-if="attempted && errors[field]"
          :id="`${prefix}-${field}-error`"
          class="product-reviews__error"
        >
          {{ errors[field] }}
        </p>
      </div>
      <label class="product-reviews__remember"
        ><input type="checkbox" :checked="remember" @change="toggleRemember" />Save my name and
        email for the next time I leave a review.</label
      >
      <p v-if="authorError" role="alert" class="product-reviews__error">{{ authorError }}</p>
      <fieldset
        class="product-reviews__rating"
        :aria-describedby="attempted && errors.rating ? `${prefix}-rating-error` : undefined"
      >
        <legend>Your Rating*</legend>
        <label v-for="rating in 5" :key="rating" class="product-reviews__rating-option">
          <input
            v-model="draft.rating"
            type="radio"
            :name="`${prefix}-rating`"
            :value="rating"
            :aria-label="`${rating} ${rating === 1 ? 'star' : 'stars'}`"
            :aria-invalid="attempted && !!errors.rating"
            required
          />
          <span aria-hidden="true">{{ rating <= draft.rating ? '★' : '☆' }}</span>
        </label>
        <p
          v-if="attempted && errors.rating"
          :id="`${prefix}-rating-error`"
          class="product-reviews__error"
        >
          {{ errors.rating }}
        </p>
      </fieldset>
      <BaseButton class="product-reviews__submit" button-type="submit">SUBMIT</BaseButton>
      <p v-if="success" role="status">Your review was saved on this device.</p>
    </form>
  </div>
</template>

<style lang="scss" scoped>
  .product-reviews {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 87px;
    color: $color-dark-gray;
    overflow-wrap: anywhere;

    @media (width < $breakpoints-l) {
      gap: 32px;
    }

    @media (width < $breakpoints-m) {
      grid-template-columns: minmax(0, 1fr);
    }

    h2 {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: $font-weight-regular;
      line-height: 26px;
      color: $color-black;
    }

    :where(p) {
      margin: 0;
    }
  }

  .product-reviews__disclosure {
    margin-bottom: 20px;
    font-size: 13px;
    line-height: 20px;
  }

  .product-reviews__review {
    padding: 24px 0;
    border-bottom: 1px solid $color-gray;

    &:last-child {
      border-bottom: 0;
    }

    header {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: baseline;
    }

    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: $font-weight-regular;
      color: $color-black;
    }

    time {
      font-size: 14px;
    }
  }

  .product-reviews__stars {
    margin: 12px 0 16px;
    font-size: 22px;
    line-height: 24px;
    color: $color-black;
  }

  .product-reviews__text {
    white-space: pre-wrap;
  }

  .product-reviews__form {
    min-width: 0;
  }

  .product-reviews__field {
    margin-top: 38px;

    label {
      display: block;
    }

    input,
    textarea {
      display: block;
      width: 100%;
      min-width: 0;
      padding: 8px 0;
      font: inherit;
      color: $color-black;
      background: transparent;
      border: 0;
      border-bottom: 1px solid $color-gray;
      border-radius: 0;
    }

    textarea {
      resize: vertical;
    }

    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 3px;
    }
  }

  .product-reviews__remember {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-top: 24px;
    font-size: 12px;
    line-height: 20px;

    input[type='checkbox'] {
      flex-shrink: 0;
      margin-top: 3px;
    }
  }

  .product-reviews__rating {
    padding: 0;
    margin: 40px 0;
    border: 0;

    legend {
      margin-bottom: 8px;
    }
  }

  .product-reviews__rating-option {
    position: relative;
    display: inline-flex;
    font-size: 26px;
    line-height: 32px;
    color: $color-black;
    cursor: pointer;

    input[type='radio'] {
      position: absolute;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;
      opacity: 0;
    }

    input:focus-visible + span {
      outline: 2px solid $color-accent;
      outline-offset: 2px;
    }
  }

  .product-reviews__submit {
    min-height: 53px;
    padding: 12px 34px;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: $font-weight-bold;
    color: $color-white;
    background: $color-black;
    border-radius: 4px;
  }

  .product-reviews__error {
    margin-top: 6px;
    font-size: 13px;
    line-height: 20px;
    color: $color-errors;
  }
</style>
