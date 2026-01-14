export interface Product {
  _id: string;
  productTitle: string;
  review?: string[];
  price: string;
  category: {
    _id: string;
    name: string;
  };
  subCategory: {
    _id: string;
    name: string;
  };
  description: string;
  images: string[];
  isProductNew?: boolean;
  inventory: {
    _id: string;
    quantity: number;
  };
  brand?: string;
  weight?: string;
  modelNumber?: string;
  mainMaterial?: string;
  color?: string;
  keyFeatures?: string[];
  sku?: string;
  size?: string;
  createdOn?: string;
  createdBy?: string;
  updatedOn?: string;
  updatedBy?: string;
  _relevanceScore?: number;
}

export interface SearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
  page?: number;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  query: string;
  cached?: boolean;
  page?: number;
  totalPages?: number;
}

export interface Suggestion {
  type: 'product' | 'brand' | 'category';
  text: string;
  value: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  cached?: boolean;
}
