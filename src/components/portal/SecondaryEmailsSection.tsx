import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Loader2 } from "lucide-react";

interface AccountLink {
  id: string;
  alias_user_id: string;
  email: string | null;
  created_at: string;
}

export function SecondaryEmailsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [links, setLinks] = useState<AccountLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-account-links", { body });
    if (error) {
      // Surface the server's message when available.
      const message = (data as any)?.error || error.message;
      throw new Error(message);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list", canonical_user_id: userId });
      setLinks(data.links || []);
    } catch (e: any) {
      console.error("Failed to load secondary emails", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAdd = async () => {
    const value = email.trim().toLowerCase();
    if (!value) return;
    setAdding(true);
    try {
      await call({ action: "add", canonical_user_id: userId, email: value });
      toast({
        title: "Secondary email added",
        description: `${value} can now sign in to this account and will receive copies of all emails.`,
      });
      setEmail("");
      await load();
    } catch (e: any) {
      toast({ title: "Could not add email", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (link: AccountLink) => {
    setRemovingId(link.alias_user_id);
    try {
      await call({ action: "remove", alias_user_id: link.alias_user_id });
      toast({ title: "Secondary email removed" });
      await load();
    } catch (e: any) {
      toast({ title: "Could not remove email", description: e.message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Secondary Emails</h4>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        Secondary emails receive a copy of every email sent to this student and can sign in to this
        same account.
      </p>

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="flex-1 truncate text-sm">{link.email || link.alias_user_id}</span>
              <Badge variant="outline" className="text-[10px]">Secondary</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRemove(link)}
                disabled={removingId === link.alias_user_id}
                aria-label={`Remove ${link.email || "secondary email"}`}
              >
                {removingId === link.alias_user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Add a secondary email</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            inputMode="email"
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={adding || !email.trim()} className="gap-1 shrink-0">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
