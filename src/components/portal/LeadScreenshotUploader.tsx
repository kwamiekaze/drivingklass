import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  ChevronDown, 
  CheckCircle2,
  AlertTriangle,
  Copy,
  X
} from 'lucide-react';
import { extractLeadFromScreenshot, OcrParsedLead } from '@/lib/ocrParser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeadScreenshotUploaderProps {
  onLeadExtracted: (data: {
    student_name: string;
    student_email: string;
    student_phone: string;
    guardian_name: string;
    guardian_email: string;
    guardian_phone: string;
    raw_ocr_text: string;
    attachment_file: File;
  }) => void;
  onCancel: () => void;
}

export function LeadScreenshotUploader({ onLeadExtracted, onCancel }: LeadScreenshotUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<OcrParsedLead | null>(null);
  const [editableData, setEditableData] = useState<{
    student_name: string;
    student_email: string;
    student_phone: string;
    guardian_name: string;
    guardian_email: string;
    guardian_phone: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setParsedData(null);
    setEditableData(null);
    
    // Auto-run OCR
    await runExtraction(file);
  };

  const runExtraction = async (file: File) => {
    setProcessing(true);
    setProgress(0);
    
    try {
      const result = await extractLeadFromScreenshot(file, setProgress);
      setParsedData(result);
      setEditableData({
        student_name: result.student_name,
        student_email: result.student_email,
        student_phone: result.student_phone,
        guardian_name: result.guardian_name,
        guardian_email: result.guardian_email,
        guardian_phone: result.guardian_phone,
      });
    } catch (error) {
      console.error('OCR extraction failed:', error);
      toast({
        title: 'OCR Failed',
        description: 'Could not extract text from the image. Try a clearer screenshot.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
      setProgress(100);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!editableData) return;
    setEditableData({ ...editableData, [field]: value });
  };

  const handleContinue = () => {
    if (!editableData || !selectedFile) return;
    
    // Validation
    if (!editableData.student_email && !editableData.student_phone) {
      toast({
        title: 'Missing required field',
        description: 'Student email OR student phone is required',
        variant: 'destructive'
      });
      return;
    }
    
    onLeadExtracted({
      ...editableData,
      raw_ocr_text: parsedData?.raw_ocr_text || '',
      attachment_file: selectedFile
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied' });
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {!selectedFile && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Upload Screenshot</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click to select or drag & drop an image
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports PNG, JPG, WEBP
            </p>
          </CardContent>
        </Card>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {/* Preview & Processing */}
      {selectedFile && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Image Preview */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Screenshot Preview
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setParsedData(null);
                    setEditableData(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  className="w-full rounded-lg border max-h-[400px] object-contain bg-muted"
                />
              )}
              
              {processing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing OCR... {progress}%
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Extracted Data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Extracted Data
                {parsedData && (
                  <Badge variant={parsedData.confidence >= 75 ? "default" : "secondary"}>
                    {parsedData.confidence}% confidence
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and edit extracted information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!editableData && !processing && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select an image to extract lead data</p>
                </div>
              )}
              
              {editableData && (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    {/* Warnings */}
                    {!editableData.student_email && !editableData.student_phone && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-destructive">No email or phone detected</p>
                          <p className="text-xs text-muted-foreground">Please enter manually</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Student Fields */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Student Info
                      </h4>
                      
                      <div className="space-y-1">
                        <Label className="text-sm">Name</Label>
                        <Input
                          value={editableData.student_name}
                          onChange={(e) => handleFieldChange('student_name', e.target.value)}
                          placeholder="Student full name"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-sm flex items-center gap-1">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={editableData.student_email}
                            onChange={(e) => handleFieldChange('student_email', e.target.value)}
                            placeholder="student@email.com"
                            className="flex-1"
                          />
                          {editableData.student_email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editableData.student_email)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-sm flex items-center gap-1">
                          Phone <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={editableData.student_phone}
                            onChange={(e) => handleFieldChange('student_phone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="flex-1"
                          />
                          {editableData.student_phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editableData.student_phone)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Guardian Fields */}
                    <div className="space-y-3 pt-2 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Guardian Info
                      </h4>
                      
                      <div className="space-y-1">
                        <Label className="text-sm">Name</Label>
                        <Input
                          value={editableData.guardian_name}
                          onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                          placeholder="Guardian full name"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-sm">Email</Label>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={editableData.guardian_email}
                            onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                            placeholder="guardian@email.com"
                            className="flex-1"
                          />
                          {editableData.guardian_email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editableData.guardian_email)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-sm">Phone</Label>
                        <div className="flex gap-2">
                          <Input
                            value={editableData.guardian_phone}
                            onChange={(e) => handleFieldChange('guardian_phone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="flex-1"
                          />
                          {editableData.guardian_phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editableData.guardian_phone)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Debug Panel */}
      {parsedData && (
        <Collapsible open={showDebug} onOpenChange={setShowDebug}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
              Debug: OCR Output & Parsing
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Raw OCR Text</h4>
                  <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-[200px] whitespace-pre-wrap">
                    {parsedData.raw_ocr_text || '(empty)'}
                  </pre>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Emails Found</h4>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.debug.emailsFound.length > 0 ? (
                        parsedData.debug.emailsFound.map((email, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {email}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Phones Found</h4>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.debug.phonesFound.length > 0 ? (
                        parsedData.debug.phonesFound.map((phone, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {phone}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Parsing Details</h4>
                  <div className="text-xs space-y-1 font-mono">
                    <p>Student name line: {parsedData.debug.studentNameLineIdx >= 0 ? parsedData.debug.studentNameLineIdx : 'not found'}</p>
                    <p>Student email line: {parsedData.debug.studentEmailLineIdx >= 0 ? parsedData.debug.studentEmailLineIdx : 'not found'}</p>
                    <p>Student phone line: {parsedData.debug.studentPhoneLineIdx >= 0 ? parsedData.debug.studentPhoneLineIdx : 'not found'}</p>
                    <p>Guardian name line: {parsedData.debug.guardianNameLineIdx >= 0 ? parsedData.debug.guardianNameLineIdx : 'not found'}</p>
                    <p>Guardian email line: {parsedData.debug.guardianEmailLineIdx >= 0 ? parsedData.debug.guardianEmailLineIdx : 'not found'}</p>
                    <p>Guardian phone line: {parsedData.debug.guardianPhoneLineIdx >= 0 ? parsedData.debug.guardianPhoneLineIdx : 'not found'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Normalized Lines (badge words removed)</h4>
                  <pre className="text-xs bg-background p-2 rounded-lg overflow-auto max-h-[120px] whitespace-pre-wrap">
                    {parsedData.debug.normalizedLines.map((line, i) => `${i}: ${line}`).join('\n') || '(none)'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!editableData || (!editableData.student_email && !editableData.student_phone)}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Continue to Save
        </Button>
      </div>
    </div>
  );
}
