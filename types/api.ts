export interface Product {
  id: number
  title: string
  price: number
  image?: string
}

export interface PicsumPhoto {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}
