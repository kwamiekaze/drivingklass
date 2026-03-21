import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
  category: string;
  difficulty: string;
  created_at: string;
}

const CATEGORIES = [
  "road_signs", "right_of_way", "traffic_laws", "safe_driving",
  "parking", "intersections", "highway", "emergency", "general"
];

const DIFFICULTIES = ["easy", "medium", "hard"];

const emptyForm = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "a",
  explanation: "",
  image_url: "",
  category: "general",
  difficulty: "medium",
};

export default function AdminPracticeQuestions() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PortalLayout>
        <QuestionsManager />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("permit_questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setQuestions(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      image_url: q.image_url || "",
      category: q.category,
      difficulty: q.difficulty,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_text || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      toast({ title: "Missing fields", description: "Fill all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      question_text: form.question_text,
      option_a: form.option_a,
      option_b: form.option_b,
      option_c: form.option_c,
      option_d: form.option_d,
      correct_answer: form.correct_answer,
      explanation: form.explanation || null,
      image_url: form.image_url || null,
      category: form.category,
      difficulty: form.difficulty,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("permit_questions").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("permit_questions").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Question updated" : "Question added" });
      setModalOpen(false);
      fetchQuestions();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("permit_questions").delete().eq("id", id);
    if (!error) {
      toast({ title: "Question deleted" });
      fetchQuestions();
    }
  };

  const filtered = questions.filter(q => {
    const matchSearch = !search || 
      q.question_text.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || q.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Practice Questions</h1>
          <p className="text-sm text-muted-foreground">{questions.length} questions in bank</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No questions found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <Card key={q.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-medium text-sm line-clamp-2">{q.question_text}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{q.category.replace(/_/g, ' ')}</Badge>
                    <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
                    <Badge className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                      Answer: {q.correct_answer.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(q)} className="h-8 w-8">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Question" : "Add New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question Text *</Label>
              <Textarea
                value={form.question_text}
                onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                placeholder="Enter the question..."
                rows={3}
              />
            </div>
            {(['a', 'b', 'c', 'd'] as const).map(letter => (
              <div key={letter}>
                <Label className="flex items-center gap-2">
                  Option {letter.toUpperCase()} *
                  {form.correct_answer === letter && <Badge className="text-[10px] bg-green-500/20 text-green-500">Correct</Badge>}
                </Label>
                <Input
                  value={form[`option_${letter}` as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [`option_${letter}`]: e.target.value }))}
                  placeholder={`Option ${letter.toUpperCase()}`}
                />
              </div>
            ))}
            <div>
              <Label>Correct Answer</Label>
              <Select value={form.correct_answer} onValueChange={v => setForm(f => ({ ...f, correct_answer: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">A</SelectItem>
                  <SelectItem value="b">B</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="d">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Explanation</Label>
              <Textarea
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                placeholder="Why is this the correct answer?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editingId ? "Update" : "Add Question"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
