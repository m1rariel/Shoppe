export interface Product {
  id: number
  title: string
  price: number
  image?: string
  category: string
  description: string
}

export enum ProductSort {
  PriceAsc = 'price-minus',
  PriceDesc = 'price-plus',
  TitleAsc = 'title-filter',
}

export interface ProductCategory {
  id: number
  name: string
}

export interface ProductCategoriesResponse {
  categories: ProductCategory[]
}

export interface PicsumPhoto {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}
