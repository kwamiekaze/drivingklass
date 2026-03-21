import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  BookOpen, CheckCircle2, XCircle, ArrowRight, ArrowLeft, 
  RotateCcw, Trophy, AlertTriangle, ClipboardList 
} from "lucide-react";

const QUESTIONS_PER_TEST = 20;
const PASSING_PERCENT = 75;

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
}

type TestPhase = "intro" | "rules" | "testing" | "results" | "review";

export default function PracticeTest() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'instructor']}>
      <PortalLayout>
        <PracticeTestContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function PracticeTestContent() {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("permit_questions")
      .select("*")
      .order("created_at");
    if (data) setAllQuestions(data);
    setLoading(false);
  };

  const startTest = useCallback(() => {
    // Shuffle and pick random questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(QUESTIONS_PER_TEST, shuffled.length));
    setTestQuestions(selected);
    setAnswers({});
    setCurrentIndex(0);
    setPhase("testing");
  }, [allQuestions]);

  const selectAnswer = (questionIdx: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: answer }));
  };

  const score = useMemo(() => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    return correct;
  }, [answers, testQuestions]);

  const percent = testQuestions.length > 0 ? Math.round((score / testQuestions.length) * 100) : 0;
  const passed = percent >= PASSING_PERCENT;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (phase === "intro") return <IntroScreen onNext={() => setPhase("rules")} questionCount={allQuestions.length} />;
  if (phase === "rules") return <RulesScreen onStart={startTest} onBack={() => setPhase("intro")} />;
  if (phase === "results") {
    return (
      <ResultsScreen 
        score={score} 
        total={testQuestions.length} 
        percent={percent} 
        passed={passed}
        onReview={() => { setCurrentIndex(0); setPhase("review"); }}
        onRetake={() => { setPhase("intro"); }}
      />
    );
  }
  if (phase === "review") {
    return (
      <ReviewScreen 
        questions={testQuestions}
        answers={answers}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
        onBack={() => setPhase("results")}
      />
    );
  }

  // Testing phase
  const currentQ = testQuestions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const allAnswered = testQuestions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentIndex + 1} of {testQuestions.length}</span>
          <span>{Object.keys(answers).length} answered</span>
        </div>
        <Progress value={((currentIndex + 1) / testQuestions.length) * 100} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold leading-relaxed">{currentQ.question_text}</h2>
          
          {currentQ.image_url && (
            <div className="flex justify-center">
              <img 
                src={currentQ.image_url} 
                alt="Question visual" 
                className="max-h-48 rounded-lg border border-border/30 object-contain"
              />
            </div>
          )}

          <div className="grid gap-3">
            {(['a', 'b', 'c', 'd'] as const).map(letter => {
              const optionKey = `option_${letter}` as keyof Question;
              const optionText = currentQ[optionKey] as string;
              const isSelected = currentAnswer === letter;
              
              return (
                <button
                  key={letter}
                  onClick={() => selectAnswer(currentIndex, letter)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "active:scale-[0.98] min-h-[52px]",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      : "border-border/40 bg-background/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {letter.toUpperCase()}
                    </span>
                    <span className="text-sm sm:text-base pt-1">{optionText}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>

        {currentIndex < testQuestions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={currentAnswer === undefined}
            className="gap-2"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setPhase("results")}
            disabled={!allAnswered}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" /> Submit Test
          </Button>
        )}
      </div>
    </div>
  );
}

function IntroScreen({ onNext, questionCount }: { onNext: () => void; questionCount: number }) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-8 sm:p-10 text-center space-y-6 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Georgia Permit Practice Test</h1>
          <p className="text-muted-foreground leading-relaxed">
            This practice test is designed to help you prepare for the Georgia DDS learner's permit exam.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="font-bold text-lg text-primary">{Math.min(QUESTIONS_PER_TEST, questionCount)}</div>
            <div className="text-muted-foreground">Questions</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="font-bold text-lg text-primary">{PASSING_PERCENT}%</div>
            <div className="text-muted-foreground">To Pass</div>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {questionCount} questions in bank
        </Badge>
        <Button size="lg" onClick={onNext} className="w-full gap-2 min-h-[52px]">
          Start Test <ArrowRight className="h-5 w-5" />
        </Button>
      </Card>
    </div>
  );
}

function RulesScreen({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-8 sm:p-10 space-y-6 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-center">Test Rules</h2>
        <ul className="space-y-3 text-sm sm:text-base">
          {[
            "One question is displayed at a time",
            "Choose the best answer from four options",
            "You can navigate back to previous questions",
            "All questions must be answered before submitting",
            "Your score is shown at the end",
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1 min-h-[48px]">Back</Button>
          <Button onClick={onStart} className="flex-1 gap-2 min-h-[48px]">
            Begin Test <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ResultsScreen({ 
  score, total, percent, passed, onReview, onRetake 
}: { 
  score: number; total: number; percent: number; passed: boolean; 
  onReview: () => void; onRetake: () => void 
}) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-8 sm:p-10 text-center space-y-6 bg-card/80 backdrop-blur-sm border-border/50">
        <div className={cn(
          "mx-auto w-20 h-20 rounded-full flex items-center justify-center",
          passed ? "bg-green-500/10" : "bg-destructive/10"
        )}>
          {passed 
            ? <Trophy className="h-10 w-10 text-green-500" />
            : <AlertTriangle className="h-10 w-10 text-destructive" />
          }
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {passed ? "PASS" : "FAIL"}
          </h2>
          <p className="text-muted-foreground">
            {passed 
              ? "Great job! You are on track for the DDS permit test." 
              : "Keep practicing to improve your score."
            }
          </p>
        </div>

        <div className="text-5xl sm:text-6xl font-bold text-primary">
          {score} <span className="text-2xl text-muted-foreground">/ {total}</span>
        </div>

        <div className="space-y-2">
          <Progress value={percent} className="h-3" />
          <p className="text-sm text-muted-foreground">{percent}% correct — {PASSING_PERCENT}% needed to pass</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onReview} className="flex-1 gap-2 min-h-[48px]">
            <BookOpen className="h-4 w-4" /> Review Answers
          </Button>
          <Button onClick={onRetake} className="flex-1 gap-2 min-h-[48px]">
            <RotateCcw className="h-4 w-4" /> Retake Test
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ReviewScreen({ 
  questions, answers, currentIndex, onNavigate, onBack 
}: { 
  questions: Question[]; answers: Record<number, string>; 
  currentIndex: number; onNavigate: (i: number) => void; onBack: () => void 
}) {
  const q = questions[currentIndex];
  const userAnswer = answers[currentIndex];
  const isCorrect = userAnswer === q.correct_answer;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Review: Question {currentIndex + 1} of {questions.length}
        </span>
        <Button variant="ghost" size="sm" onClick={onBack}>Back to Results</Button>
      </div>

      {/* Question grid navigator */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q2, i) => {
          const correct = answers[i] === q2.correct_answer;
          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={cn(
                "w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center border-2 transition-all",
                i === currentIndex ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                correct ? "bg-green-500/20 border-green-500/50 text-green-500" : "bg-destructive/20 border-destructive/50 text-destructive"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question */}
      <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur-sm border-border/50 space-y-6">
        <div className="flex items-center gap-2">
          {isCorrect 
            ? <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Correct</Badge>
            : <Badge variant="destructive">Incorrect</Badge>
          }
        </div>

        <h2 className="text-lg font-semibold">{q.question_text}</h2>

        {q.image_url && (
          <div className="flex justify-center">
            <img src={q.image_url} alt="Question visual" className="max-h-48 rounded-lg border border-border/30 object-contain" />
          </div>
        )}

        <div className="grid gap-3">
          {(['a', 'b', 'c', 'd'] as const).map(letter => {
            const optionKey = `option_${letter}` as keyof Question;
            const optionText = q[optionKey] as string;
            const isUserAnswer = userAnswer === letter;
            const isCorrectAnswer = q.correct_answer === letter;

            return (
              <div
                key={letter}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  isCorrectAnswer && "border-green-500/60 bg-green-500/10",
                  isUserAnswer && !isCorrectAnswer && "border-destructive/60 bg-destructive/10",
                  !isCorrectAnswer && !isUserAnswer && "border-border/30 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isCorrectAnswer ? "bg-green-500 text-white" : 
                    isUserAnswer ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {isCorrectAnswer ? <CheckCircle2 className="h-4 w-4" /> : 
                     isUserAnswer ? <XCircle className="h-4 w-4" /> : letter.toUpperCase()}
                  </span>
                  <span className="text-sm sm:text-base pt-1">{optionText}</span>
                </div>
              </div>
            );
          })}
        </div>

        {q.explanation && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-sm font-medium mb-1">Explanation</p>
            <p className="text-sm text-muted-foreground">{q.explanation}</p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button
          onClick={() => onNavigate(Math.min(questions.length - 1, currentIndex + 1))}
          disabled={currentIndex === questions.length - 1}
          className="gap-2"
        >
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
