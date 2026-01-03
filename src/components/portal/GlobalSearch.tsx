import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Users, UserCog, Shield, FileUser, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { results, loading, search, clearResults } = useGlobalSearch();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
        setOpen(true);
      } else {
        clearResults();
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clearResults]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setOpen(false);
    clearResults();
    navigate(result.link);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'student': return User;
      case 'instructor': return Users;
      case 'staff': return UserCog;
      case 'admin': return Shield;
      case 'lead': return FileUser;
      default: return User;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'student': return 'bg-blue-500/10 text-blue-500';
      case 'instructor': return 'bg-green-500/10 text-green-500';
      case 'staff': return 'bg-orange-500/10 text-orange-500';
      case 'admin': return 'bg-purple-500/10 text-purple-500';
      case 'lead': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    student: 'Students',
    instructor: 'Instructors',
    staff: 'Staff',
    admin: 'Admins',
    lead: 'Leads',
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              clearResults();
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                    {typeLabels[type] || type} ({items.length})
                  </div>
                  {items.map((result) => {
                    const Icon = getIcon(result.type);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                      >
                        <div className={cn('flex-shrink-0 p-1.5 rounded-md', getTypeColor(result.type))}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.name || 'Unknown'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {result.email && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {result.email}
                              </span>
                            )}
                            {result.phone && (
                              <span className="text-xs text-muted-foreground">
                                • {result.phone}
                              </span>
                            )}
                          </div>
                          {result.address && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              📍 {result.address}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
