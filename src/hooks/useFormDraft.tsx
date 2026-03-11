import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

const APP_NAME = 'DrivingKlass';
const DEBOUNCE_MS = 600;

// Fields that should NEVER be saved (security)
const EXCLUDED_FIELDS = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'secret'];

interface DraftMeta {
  lastUpdated: number;
  hasFile?: boolean;
  fileName?: string;
}

interface StoredDraft<T> {
  data: T;
  meta: DraftMeta;
}

function getDraftKey(formName: string, userId?: string | null, routePath?: string): string {
  const userKey = userId || 'anon';
  const route = routePath || window.location.pathname;
  return `${APP_NAME}:${formName}:${userKey}:${route}`;
}

function sanitizeData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  for (const field of EXCLUDED_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  return sanitized;
}

interface UseFormDraftOptions<T> {
  formName: string;
  values: T;
  setValue: (values: T) => void;
  userId?: string | null;
  routePath?: string;
  serverTimestamp?: string | number | null; // Last server update time
  fileInfo?: {
    hasFile: boolean;
    fileName?: string;
  };
  onFileRestoreNeeded?: () => void; // Callback when file needs to be reselected
  enabled?: boolean; // Allow disabling for edit modes where server data takes precedence
}

export function useFormDraft<T extends Record<string, any>>({
  formName,
  values,
  setValue,
  userId,
  routePath,
  serverTimestamp,
  fileInfo,
  onFileRestoreNeeded,
  enabled = true,
}: UseFormDraftOptions<T>) {
  const draftKey = getDraftKey(formName, userId, routePath);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    if (!enabled) return;
    
    const sanitized = sanitizeData(values);
    const draft: StoredDraft<T> = {
      data: sanitized,
      meta: {
        lastUpdated: Date.now(),
        hasFile: fileInfo?.hasFile,
        fileName: fileInfo?.fileName,
      },
    };
    
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save form draft:', e);
    }
  }, [draftKey, values, fileInfo, enabled]);

  // Debounced save on value change
  useEffect(() => {
    if (!enabled || !initialLoadDone.current) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      saveDraft();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [values, saveDraft, enabled]);

  // Load draft on mount
  useEffect(() => {
    if (!enabled) {
      initialLoadDone.current = true;
      return;
    }

    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) {
        initialLoadDone.current = true;
        return;
      }

      const draft: StoredDraft<T> = JSON.parse(stored);
      
      // Check if draft is newer than server data
      const serverTime = serverTimestamp 
        ? new Date(serverTimestamp).getTime() 
        : 0;
      
      const draftIsNewer = draft.meta.lastUpdated > serverTime;
      
      if (draftIsNewer) {
        setHasDraft(true);
        
        // Auto-restore for anonymous/new forms
        if (!serverTimestamp) {
          setValue(draft.data);
          setDraftRestored(true);
          
          // Check if file needs reselection
          if (draft.meta.hasFile && onFileRestoreNeeded) {
            onFileRestoreNeeded();
          }
        } else {
          // For existing data, show toast with restore option
          toast('Saved draft found', {
            description: 'You have unsaved changes from a previous session.',
            action: {
              label: 'Restore',
              onClick: () => {
                setValue(draft.data);
                setDraftRestored(true);
                if (draft.meta.hasFile && onFileRestoreNeeded) {
                  onFileRestoreNeeded();
                }
                toast.success('Draft restored');
              },
            },
            duration: 8000,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load form draft:', e);
    }
    
    initialLoadDone.current = true;
  }, [draftKey, enabled]); // Only run on mount

  // Clear draft (call on successful submit)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftRestored(false);
    } catch (e) {
      console.warn('Failed to clear form draft:', e);
    }
  }, [draftKey]);

  // Discard draft manually
  const discardDraft = useCallback(() => {
    clearDraft();
    toast.info('Draft discarded');
  }, [clearDraft]);

  // Check if there are unsaved changes (for beforeunload)
  const hasUnsavedChanges = useCallback(() => {
    if (!enabled) return false;
    try {
      const stored = localStorage.getItem(draftKey);
      return !!stored;
    } catch {
      return false;
    }
  }, [draftKey, enabled]);

  // Beforeunload warning (desktop only, lightweight)
  useEffect(() => {
    if (!enabled) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, enabled]);

  return {
    clearDraft,
    discardDraft,
    hasDraft,
    draftRestored,
  };
}

// Helper component for showing file reselection notice
export function FileRestoreNotice({ fileName }: { fileName?: string }) {
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
      {fileName ? `"${fileName}" was previously selected. ` : ''}
      Please reselect your file for security.
    </p>
  );
}
