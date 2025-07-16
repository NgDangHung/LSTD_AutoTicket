import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { proceduresAPI } from '@/libs/api';

interface SearchResult {
  id: number;
  name: string;
  field_id: number;
  counters: Array<{
    id: number;
    name: string;
    status: string;
  }>;
}

export const useOptimizedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce search query by 500ms to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const performSearch = useCallback(async (query: string) => {
    // Early return for short queries
    if (query.trim().length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 API Call:', `GET /procedures/search-extended?search=${query}`);
      
      const response = await proceduresAPI.searchExtended(query);
      const results = response.data; // Extract data from response
      setSearchResults(results);
      
      console.log('✅ Search Results:', {
        query,
        resultsCount: results.length,
        fieldIds: [...new Set(results.map((r: SearchResult) => r.field_id))]
      });
    } catch (err: any) {
      console.error('❌ Search Error:', err);
      setError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only trigger search when debounced value changes (after user stops typing for 500ms)
  useEffect(() => {
    performSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    error,
    clearSearch,
    isSearchMode: searchQuery.trim().length >= 2
  };
};
