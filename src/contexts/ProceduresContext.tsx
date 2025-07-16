'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { proceduresAPI } from '@/libs/api';

interface Procedure {
  id: number;
  name: string;
  field_id: number;
  // Add other procedure properties as needed
}

interface ProceduresContextType {
  allProcedures: Procedure[];
  loading: boolean;
  error: string | null;
  refreshProcedures: () => Promise<void>;
  getProceduresByFieldId: (fieldId: number) => Procedure[];
  validateSearchResult: (searchResults: any[], fieldIds: number[], searchQuery: string) => number[];
}

const ProceduresContext = createContext<ProceduresContextType | undefined>(undefined);

export const ProceduresProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllProcedures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await proceduresAPI.getProcedures();
      setAllProcedures(response.data);
      console.log('✅ Loaded all procedures:', response.data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch procedures');
      console.error('❌ Error loading procedures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProcedures();
  }, []);

  const getProceduresByFieldId = (fieldId: number): Procedure[] => {
    return allProcedures.filter(procedure => procedure.field_id === fieldId);
  };

  const validateSearchResult = (searchResults: any[], fieldIds: number[], searchQuery: string): number[] => {
    // Cross-reference search results with local data to ensure accuracy
    const validFieldIds = new Set<number>();
    
    searchResults.forEach(searchResult => {
      // Check if this procedure exists in our local data with the same field_id
      const localProcedure = allProcedures.find(p => p.id === searchResult.id);
      
      if (localProcedure && localProcedure.field_id === searchResult.field_id) {
        // Additional check: verify that the procedure name actually contains the search query
        const procedureNameLower = localProcedure.name.toLowerCase();
        const searchQueryLower = searchQuery.toLowerCase();
        
        // Remove spaces and special characters for better matching
        const normalizedProcedureName = procedureNameLower.replace(/\s+/g, '').replace(/[^\w]/g, '');
        const normalizedSearchQuery = searchQueryLower.replace(/\s+/g, '').replace(/[^\w]/g, '');
        
        if (normalizedProcedureName.includes(normalizedSearchQuery)) {
          validFieldIds.add(searchResult.field_id);
          console.log('✅ Valid match:', {
            procedure: localProcedure.name,
            field_id: localProcedure.field_id,
            searchQuery,
            match: normalizedProcedureName.includes(normalizedSearchQuery)
          });
        } else {
          console.log('❌ Filtered out irrelevant:', {
            procedure: localProcedure.name,
            field_id: localProcedure.field_id,
            searchQuery,
            reason: 'Does not contain search query'
          });
        }
      } else {
        console.log('❌ Filtered out inconsistent:', {
          searchResult: searchResult.name,
          field_id: searchResult.field_id,
          reason: 'Not found in local data or field_id mismatch'
        });
      }
    });

    // Filter fieldIds to only include validated ones
    return fieldIds.filter(fieldId => validFieldIds.has(fieldId));
  };

  const refreshProcedures = async () => {
    await fetchAllProcedures();
  };

  const value: ProceduresContextType = {
    allProcedures,
    loading,
    error,
    refreshProcedures,
    getProceduresByFieldId,
    validateSearchResult,
  };

  return (
    <ProceduresContext.Provider value={value}>
      {children}
    </ProceduresContext.Provider>
  );
};

export const useProceduresContext = () => {
  const context = useContext(ProceduresContext);
  if (context === undefined) {
    throw new Error('useProceduresContext must be used within a ProceduresProvider');
  }
  return context;
};
