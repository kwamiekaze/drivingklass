import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save, Loader2 } from "lucide-react";

interface HoursEditorProps {
  studentId: string;
  currentHours: number;
  onUpdate?: (newHours: number) => void;
}

export function HoursEditor({ studentId, currentHours, onUpdate }: HoursEditorProps) {
  const { toast } = useToast();
  const [hours, setHours] = useState(currentHours.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const numericHours = parseFloat(hours);
    
    if (isNaN(numericHours) || numericHours < 0) {
      toast({
        title: "Invalid Hours",
        description: "Please enter a valid number of hours (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hours_remaining: numericHours })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: "Hours Updated",
        description: `Student hours set to ${numericHours.toFixed(1)}`,
      });
      
      onUpdate?.(numericHours);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update hours",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="portal-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Lesson Hours
        </CardTitle>
        <CardDescription>
          Set the student's remaining lesson hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="hours">Hours Remaining</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="theme-input"
              placeholder="e.g., 6.0"
            />
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
