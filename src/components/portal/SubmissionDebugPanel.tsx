import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DebugLogEntry {
  timestamp: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'upload' | 'select' | 'delete';
  status: 'pending' | 'success' | 'error';
  payload?: Record<string, any>;
  error?: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
}

interface SubmissionDebugPanelProps {
  logs: DebugLogEntry[];
  authUid: string | null | undefined;
  isAdmin?: boolean;
  showAlways?: boolean;
}

function sanitizePayload(payload?: Record<string, any>): Record<string, any> | undefined {
  if (!payload) return undefined;
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'guardian_email', 'guardian_phone'];
  
  for (const [key, value] of Object.entries(payload)) {
    // Keep ID fields and non-sensitive data
    if (key.endsWith('_id') || key === 'id' || key === 'bucket' || key === 'source' || key === 'status') {
      sanitized[key] = value;
    } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 50) {
      sanitized[key] = value.substring(0, 50) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function SubmissionDebugPanel({ logs, authUid, isAdmin = false, showAlways = false }: SubmissionDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasErrors = logs.some(log => log.status === 'error');
  const isAuthMissing = !authUid;
  
  // Only show if there are errors, user is admin, or showAlways is true
  if (!hasErrors && !isAdmin && !showAlways) {
    return null;
  }
  
  const getStatusIcon = (status: DebugLogEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <span className="h-4 w-4 rounded-full bg-muted animate-pulse" />;
    }
  };
  
  const getStatusBadgeVariant = (status: DebugLogEntry['status']) => {
    switch (status) {
      case 'success': return 'default' as const;
      case 'error': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <Card className={`border ${hasErrors ? 'border-destructive/50 bg-destructive/5' : 'border-muted'}`}>
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <span>Submission Debug</span>
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                {logs.filter(l => l.status === 'error').length} error(s)
              </Badge>
            )}
            {isAuthMissing && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                No Auth
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Auth Status */}
          <div className="p-2 rounded bg-muted/50 text-xs font-mono">
            <span className="text-muted-foreground">auth.uid(): </span>
            {authUid ? (
              <span className="text-foreground">{authUid}</span>
            ) : (
              <span className="text-destructive font-semibold">NULL (not signed in!)</span>
            )}
          </div>
          
          {isAuthMissing && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                You must be signed in to submit. Database writes will fail.
              </p>
            </div>
          )}
          
          {/* Log Entries */}
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No operations logged yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded border text-xs ${
                    log.status === 'error' 
                      ? 'border-destructive/30 bg-destructive/5' 
                      : 'border-muted bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(log.status)}
                    <Badge variant={getStatusBadgeVariant(log.status)} className="text-[10px] px-1.5 py-0">
                      {log.operation.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-muted-foreground">{log.table}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{log.timestamp}</span>
                  </div>
                  
                  {log.payload && (
                    <pre className="mt-1 p-1.5 rounded bg-background text-[10px] overflow-x-auto">
                      {JSON.stringify(sanitizePayload(log.payload), null, 2)}
                    </pre>
                  )}
                  
                  {log.error && (
                    <div className="mt-1 p-1.5 rounded bg-destructive/10 text-destructive">
                      <p className="font-medium">{log.error.message || 'Unknown error'}</p>
                      {log.error.code && <p className="text-[10px]">Code: {log.error.code}</p>}
                      {log.error.details && <p className="text-[10px]">Details: {log.error.details}</p>}
                      {log.error.hint && <p className="text-[10px]">Hint: {log.error.hint}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Hook for managing debug logs
export function useSubmissionDebug() {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  
  const addLog = (entry: Omit<DebugLogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, {
      ...entry,
      timestamp: new Date().toLocaleTimeString(),
    }]);
  };
  
  const updateLastLog = (updates: Partial<DebugLogEntry>) => {
    setLogs(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...updates };
      return updated;
    });
  };
  
  const clearLogs = () => setLogs([]);
  
  return { logs, addLog, updateLastLog, clearLogs };
}
