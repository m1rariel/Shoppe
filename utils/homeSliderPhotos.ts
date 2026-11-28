export const homeSliderFallbackPhotos = [
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
]

export const createHomeSliderImage = (source: string) => {
  let url: URL
  try {
    url = new URL(source)
  } catch {
    return { src: source }
  }

  const picsumPathPattern = /^\/id\/([^/]+)\//
  const picsumId =
    url.hostname === 'picsum.photos' ? url.pathname.match(picsumPathPattern)?.[1] : null
  const isUnsplash = url.hostname === 'images.unsplash.com'
  if (!picsumId && !isUnsplash) return { src: source }

  const resize = (width: number, height: number) => {
    if (picsumId) return `https://picsum.photos/id/${picsumId}/${width}/${height}.webp`

    const resized = new URL(url)
    resized.searchParams.set('w', String(width))
    resized.searchParams.set('h', String(height))
    return resized.href
  }

  return {
    src: resize(1280, 640),
    srcset: [768, 1280, 1920, 2560]
      .map((width) => `${resize(width, width / 2)} ${width}w`)
      .join(', '),
    mobileSrcset: [400, 640, 800, 1280, 1536]
      .map((width) => `${resize(width, width)} ${width}w`)
      .join(', '),
    width: 1280,
    height: 640,
  }
}
