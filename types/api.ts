export interface Product {
  id: number
  name: string
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
