import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/portal';
import { Lead } from '@/types/leads';

export interface SearchResult {
  type: 'student' | 'instructor' | 'staff' | 'admin' | 'lead';
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  link: string;
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];
    const searchTerm = `%${query}%`;

    try {
      // Search profiles (students, instructors, staff, admins)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, pickup_address, dropoff_address')
        .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},pickup_address.ilike.${searchTerm},dropoff_address.ilike.${searchTerm},permit_number.ilike.${searchTerm}`)
        .limit(20);

      if (profiles) {
        // Get roles for each profile
        const rolePromises = profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();
          
          const role = roleData?.role || 'student';
          
          return {
            type: role as 'student' | 'instructor' | 'staff' | 'admin',
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            address: profile.pickup_address || profile.dropoff_address,
            link: role === 'student' 
              ? `/admin/users/students?id=${profile.id}`
              : role === 'instructor'
              ? `/admin/users/instructors?id=${profile.id}`
              : `/admin/approvals`,
          };
        });

        const profileResults = await Promise.all(rolePromises);
        searchResults.push(...profileResults);
      }

      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, full_name, email, phone, home_address, pickup_locations')
        .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},home_address.ilike.${searchTerm},pickup_locations.ilike.${searchTerm},permit_number.ilike.${searchTerm}`)
        .limit(10);

      if (leads) {
        for (const lead of leads) {
          searchResults.push({
            type: 'lead',
            id: lead.id,
            name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            address: lead.home_address || lead.pickup_locations,
            link: `/admin/leads?id=${lead.id}`,
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clearResults };
}
