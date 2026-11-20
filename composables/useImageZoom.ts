import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'

export function useImageZoom(viewportRef: Ref<HTMLElement | null>, isActive: () => boolean) {
  const scale = ref(1)

  type Point = { x: number; y: number }
  const pointers = new Map<number, Point>()
  let gesture: { points: Point[]; scale: number; scroll: Point } | null = null
  let pendingScrollPosition: Point | null = null
  let scrollUpdateId = 0
  const clearGesture = () => {
    const pointerIds = [...pointers.keys()]
    pointers.clear()
    gesture = null
    pendingScrollPosition = null
    scrollUpdateId++
    for (const id of pointerIds) {
      if (viewportRef.value?.hasPointerCapture(id)) viewportRef.value.releasePointerCapture(id)
    }
  }

  const resetZoom = () => {
    clearGesture()
    scale.value = 1
    if (viewportRef.value) {
      viewportRef.value.scrollLeft = 0
      viewportRef.value.scrollTop = 0
    }
  }

  const rebaseGesture = () => {
    const viewport = viewportRef.value
    gesture =
      viewport && pointers.size
        ? {
            points: [...pointers.values()].slice(0, 2),
            scale: scale.value,
            scroll: pendingScrollPosition || { x: viewport.scrollLeft, y: viewport.scrollTop },
          }
        : null
  }

  const setScroll = (point: Point) => {
    const viewport = viewportRef.value
    if (!viewport) return
    pendingScrollPosition = {
      x: Math.max(0, Math.min(viewport.clientWidth * (scale.value - 1), point.x)),
      y: Math.max(0, Math.min(viewport.clientHeight * (scale.value - 1), point.y)),
    }
    const updateId = ++scrollUpdateId
    void nextTick(() => {
      if (updateId !== scrollUpdateId || !isActive() || !pendingScrollPosition) return
      viewport.scrollLeft = Math.min(
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
        pendingScrollPosition.x,
      )
      viewport.scrollTop = Math.min(
        Math.max(0, viewport.scrollHeight - viewport.clientHeight),
        pendingScrollPosition.y,
      )
      pendingScrollPosition = null
    })
  }

  const startPointer = (event: PointerEvent) => {
    if (!isActive() || !['touch', 'pen'].includes(event.pointerType)) return
    event.preventDefault()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    viewportRef.value?.setPointerCapture(event.pointerId)
    rebaseGesture()
  }

  const movePointer = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId) || !gesture) return
    event.preventDefault()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.values()].slice(0, 2)
    const startPoints = gesture.points
    if (points.length === 1) {
      if (scale.value > 1)
        setScroll({
          x: gesture.scroll.x + startPoints[0].x - points[0].x,
          y: gesture.scroll.y + startPoints[0].y - points[0].y,
        })
      return
    }
    const distance = (pair: Point[]) => Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y)
    const startDistance = distance(startPoints)
    if (!startDistance) {
      rebaseGesture()
      return
    }
    const bounds = viewportRef.value!.getBoundingClientRect()
    const midpoint = (pair: Point[]) => ({
      x: (pair[0].x + pair[1].x) / 2 - bounds.left,
      y: (pair[0].y + pair[1].y) / 2 - bounds.top,
    })
    const startMidpoint = midpoint(startPoints)
    const currentMidpoint = midpoint(points)
    scale.value = Math.max(1, Math.min(4, (gesture.scale * distance(points)) / startDistance))
    setScroll({
      x: ((gesture.scroll.x + startMidpoint.x) * scale.value) / gesture.scale - currentMidpoint.x,
      y: ((gesture.scroll.y + startMidpoint.y) * scale.value) / gesture.scale - currentMidpoint.y,
    })
  }

  const endPointer = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return
    rebaseGesture()
    if (viewportRef.value?.hasPointerCapture(event.pointerId)) {
      viewportRef.value.releasePointerCapture(event.pointerId)
    }
  }

  const changeScale = (step: number) => {
    const element = viewportRef.value
    const previousScale = scale.value
    const position = pendingScrollPosition || {
      x: element?.scrollLeft || 0,
      y: element?.scrollTop || 0,
    }
    clearGesture()
    scale.value = Math.max(1, Math.min(4, scale.value + step))
    const center = { x: (element?.clientWidth || 0) / 2, y: (element?.clientHeight || 0) / 2 }
    setScroll({
      x: ((position.x + center.x) * scale.value) / previousScale - center.x,
      y: ((position.y + center.y) * scale.value) / previousScale - center.y,
    })
  }

  onBeforeUnmount(clearGesture)

  return {
    scale,
    resetZoom,
    changeScale,
    startPointer,
    movePointer,
    endPointer,
    cancelPointers: clearGesture,
  }
}
