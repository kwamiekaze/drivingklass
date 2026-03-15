import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquareText, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportCardFeedbackProps {
  reportCardId: string;
  studentName?: string;
  /** Pre-fill fields for logged-in users */
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  /** For notification routing */
  instructorId?: string;
}

export function ReportCardFeedback({
  reportCardId,
  studentName,
  prefillName = "",
  prefillEmail = "",
  prefillPhone = "",
  instructorId,
}: ReportCardFeedbackProps) {
  const { toast } = useToast();
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState(prefillPhone);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!validateEmail(email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (message.trim().length < 10) {
      toast({ title: "Message must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (message.trim().length > 2000) {
      toast({ title: "Message must be under 2000 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Check if authenticated
      const { data: { user } } = await supabase.auth.getUser();

      // Insert feedback
      const { error: fbError } = await supabase.from("report_card_feedback" as any).insert([{
        report_card_id: reportCardId,
        sender_name: name.trim(),
        sender_email: email.trim(),
        sender_phone: phone.trim() || null,
        message: message.trim(),
        student_name: studentName || null,
        is_authenticated: !!user,
        sender_user_id: user?.id || null,
      }]);

      if (fbError) throw fbError;

      // Send notifications to admins
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const notifRecipients = new Set<string>();
      if (adminRoles) adminRoles.forEach((r: any) => notifRecipients.add(r.user_id));
      if (instructorId) notifRecipients.add(instructorId);

      const reportLink = `/report-cards/${reportCardId}`;
      const notifications = Array.from(notifRecipients).map((userId) => ({
        user_id: userId,
        title: "Report Card Feedback",
        message: `${name.trim()} sent feedback${studentName ? ` about ${studentName}'s report card` : ""}: "${message.trim().substring(0, 100)}${message.trim().length > 100 ? "..." : ""}"`,
        type: "report_card",
        severity: "info",
        link: reportLink,
        report_card_id: reportCardId,
      }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      setSubmitted(true);
      toast({ title: "Feedback sent!", description: "Your message has been received." });
    } catch (err) {
      console.error("Feedback submission error:", err);
      toast({ title: "Failed to send feedback", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="portal-card border-green-500/20">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-semibold text-foreground mb-1">Thank You!</h4>
          <p className="text-sm text-muted-foreground">
            Your feedback has been sent to the instructor and team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-sm sm:text-base text-foreground">Questions or Feedback</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Have questions about this report card? Send a message to the instructor and team.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fb-name" className="text-xs">Name *</Label>
              <Input
                id="fb-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-email" className="text-xs">Email *</Label>
              <Input
                id="fb-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-phone" className="text-xs">Phone (optional)</Label>
            <Input
              id="fb-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-message" className="text-xs">Message *</Label>
            <Textarea
              id="fb-message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              required
            />
            <p className="text-[10px] text-muted-foreground text-right">{message.length}/2000</p>
          </div>
          <Button
            type="submit"
            className="w-full cta-button min-h-[44px]"
            disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Feedback
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
