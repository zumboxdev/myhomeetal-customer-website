import { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { debounce } from 'lodash';

interface SearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
}

interface SearchResult {
  products: any[];
  total: number;
  cached?: boolean;
}

interface Suggestion {
  type: 'product' | 'brand' | 'category';
  text: string;
  value: string;
}

export function useSearch(filters: SearchFilters, enabled: boolean = true) {
  const queryKey = ['search', filters];

  return useQuery<SearchResult>(
    queryKey,
    async () => {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());

      const { data } = await axios.get(`/api/search/products?${params.toString()}`);
      return data;
    },
    {
      enabled: enabled && !!filters.query && filters.query.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    }
  );
}

export function useSearchSuggestions(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query to avoid too many API calls
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  return useQuery<{ suggestions: Suggestion[] }>(
    ['suggestions', debouncedQuery],
    async () => {
      const { data } = await axios.get(
        `/api/search/suggestions?query=${encodeURIComponent(debouncedQuery)}`
      );
      return data;
    },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
    }
  );
}

// Hook for managing search state
export function useSearchState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Omit<SearchFilters, 'query'>>({
    sortBy: 'relevance',
    limit: 50,
  });

  const updateFilter = useCallback((key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sortBy: 'relevance',
      limit: 50,
    });
  }, []);

  const fullFilters: SearchFilters = {
    query: searchQuery,
    ...filters,
  };

  return {
    searchQuery,
    setSearchQuery,
    filters: fullFilters,
    updateFilter,
    clearFilters,
  };
}
