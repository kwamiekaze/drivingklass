import { useState, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  AlertTriangle,
  Loader2,
  RotateCcw,
  Shield,
  Database,
  Wrench
} from "lucide-react";
import { 
  QATestResult, 
  TestRole, 
  getTestsForRole, 
  parseSchemaError,
  isRLSError,
  QATestDefinition
} from "@/lib/qaTests";

export default function AdminQA() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PortalLayout>
        <AdminQAContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminQAContent() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<TestRole | 'all'>('all');
  const [results, setResults] = useState<QATestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const runTests = async (testsToRun: QATestDefinition[]) => {
    setIsRunning(true);
    setLogs([]);
    addLog(`Starting QA run with ${testsToRun.length} tests...`);

    const newResults: QATestResult[] = [];

    for (const test of testsToRun) {
      setCurrentTest(test.id);
      addLog(`Running: ${test.name} (${test.role})`);
      
      const startTime = Date.now();
      
      try {
        const result = await test.run();
        const duration = Date.now() - startTime;
        
        if (result.success) {
          addLog(`✓ PASS: ${test.name} (${duration}ms)`);
          newResults.push({
            id: test.id,
            name: test.name,
            role: test.role,
            status: 'pass',
            duration,
          });
        } else {
          addLog(`✗ FAIL: ${test.name} - ${result.error}`);
          
          // Analyze the error
          let autoFix: string | undefined;
          
          if (result.error) {
            const schemaIssue = parseSchemaError(result.error);
            if (schemaIssue.type === 'column' && schemaIssue.column) {
              addLog(`  → Schema issue detected: missing column '${schemaIssue.column}'`);
              autoFix = `Schema issue: ${schemaIssue.column} column missing`;
            } else if (isRLSError(result.error)) {
              addLog(`  → RLS policy issue detected`);
              autoFix = 'RLS policy restriction';
            }
          }
          
          newResults.push({
            id: test.id,
            name: test.name,
            role: test.role,
            status: 'fail',
            errorMessage: result.error,
            autoFixApplied: autoFix,
            duration,
          });
        }
      } catch (e: any) {
        const duration = Date.now() - startTime;
        addLog(`✗ ERROR: ${test.name} - ${e.message}`);
        newResults.push({
          id: test.id,
          name: test.name,
          role: test.role,
          status: 'fail',
          errorMessage: e.message,
          duration,
        });
      }
    }

    setResults(newResults);
    setCurrentTest(null);
    setIsRunning(false);

    const passCount = newResults.filter(r => r.status === 'pass').length;
    const failCount = newResults.filter(r => r.status === 'fail').length;
    
    addLog(`\nQA Complete: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      toast({ title: "All Tests Passed! ✓", description: `${passCount} tests completed successfully.` });
    } else {
      toast({ 
        title: "Some Tests Failed", 
        description: `${passCount} passed, ${failCount} failed.`,
        variant: "destructive"
      });
    }
  };

  const handleRunFullQA = () => {
    const tests = getTestsForRole(selectedRole);
    runTests(tests);
  };

  const handleRerunFailed = () => {
    const failedIds = results.filter(r => r.status === 'fail').map(r => r.id);
    const allTests = getTestsForRole(selectedRole);
    const failedTests = allTests.filter(t => failedIds.includes(t.id));
    if (failedTests.length > 0) {
      runTests(failedTests);
    } else {
      toast({ title: "No Failed Tests", description: "All tests passed!" });
    }
  };

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      role: selectedRole,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length,
      },
      results,
      logs,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const allPassed = results.length > 0 && failCount === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading flex items-center gap-2">
          <Shield className="h-7 w-7" />
          System QA / Proof Test
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Run comprehensive tests across all roles and features
        </p>
      </div>

      {/* Controls */}
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Test Controls</CardTitle>
          <CardDescription>Select a role and run the QA suite</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as TestRole | 'all')}>
              <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                <SelectItem value="all">Run All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleRunFullQA} 
              disabled={isRunning}
              className="min-h-[44px] gap-2 flex-1 sm:flex-none"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Full QA
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleRerunFailed} 
              disabled={isRunning || failCount === 0}
              className="min-h-[44px] gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run Failed
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleExportReport} 
              disabled={results.length === 0}
              className="min-h-[44px] gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Clear Banner */}
      {allPassed && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-bold text-lg text-green-600 dark:text-green-400">All Clear! ✓</p>
              <p className="text-sm text-muted-foreground">
                All {passCount} tests passed successfully.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="portal-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{results.length}</p>
              <p className="text-xs text-muted-foreground">Total Tests</p>
            </CardContent>
          </Card>
          <Card className="portal-card border-green-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{passCount}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card className={`portal-card ${failCount > 0 ? 'border-red-500/50' : ''}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${failCount > 0 ? 'text-red-500' : ''}`}>{failCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Progress Log */}
        <Card className="portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Progress Log
              {isRunning && currentTest && (
                <Badge variant="secondary" className="ml-2 gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {currentTest}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-3 bg-muted/30">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {logs.length === 0 ? (
                  <span className="text-muted-foreground">Click "Run Full QA" to start...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={
                      log.includes('✓') ? 'text-green-500' : 
                      log.includes('✗') ? 'text-red-500' : 
                      log.includes('→') ? 'text-yellow-500' : ''
                    }>
                      {log}
                    </div>
                  ))
                )}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results yet. Run the QA suite to see results.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map(result => (
                    <div 
                      key={result.id}
                      className={`p-3 rounded-lg border ${
                        result.status === 'pass' ? 'border-green-500/30 bg-green-500/5' :
                        result.status === 'fail' ? 'border-red-500/30 bg-red-500/5' :
                        'border-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.status === 'pass' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : result.status === 'fail' ? (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{result.name}</p>
                            <Badge variant="outline" className="text-xs capitalize">{result.role}</Badge>
                            {result.duration && (
                              <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                            )}
                          </div>
                          {result.errorMessage && (
                            <p className="text-xs text-red-500 mt-1 line-clamp-2">{result.errorMessage}</p>
                          )}
                          {result.autoFixApplied && (
                            <p className="text-xs text-yellow-500 mt-1">
                              ⚡ {result.autoFixApplied}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
