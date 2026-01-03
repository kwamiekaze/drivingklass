import { useState } from "react";
import { ReportCard, RATING_CATEGORIES } from "@/types/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileText, Calendar, User, Star, MessageSquare, Volume2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ReportCardListProps {
  reportCards: ReportCard[];
  userRole: 'student' | 'instructor' | 'staff' | 'admin';
  onEdit?: (reportCard: ReportCard) => void;
}

export function ReportCardList({ reportCards, userRole, onEdit }: ReportCardListProps) {
  const [selectedCard, setSelectedCard] = useState<ReportCard | null>(null);

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'bg-muted';
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 6) return 'bg-yellow-500';
    if (rating >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const canSeeInternalMessage = userRole === 'staff' || userRole === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report Cards ({reportCards.length})
        </h3>
      </div>

      {reportCards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No report cards yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reportCards.map(card => (
            <Card 
              key={card.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedCard(card)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {card.session?.starts_at 
                          ? format(parseISO(card.session.starts_at), 'MMM d, yyyy')
                          : format(parseISO(card.created_at), 'MMM d, yyyy')
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {userRole === 'student' 
                          ? card.instructor?.full_name || 'Instructor'
                          : card.student?.full_name || 'Student'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getRatingColor(card.overall)}>
                      <Star className="h-3 w-3 mr-1" />
                      {card.overall || '-'}/10
                    </Badge>
                  </div>
                </div>
                
                {card.message_to_student && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {card.message_to_student}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Card Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCard && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {selectedCard.session?.starts_at 
                      ? format(parseISO(selectedCard.session.starts_at), 'MMMM d, yyyy')
                      : format(parseISO(selectedCard.created_at), 'MMMM d, yyyy')
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {selectedCard.session?.starts_at 
                      ? `${format(parseISO(selectedCard.session.starts_at), 'h:mm a')} - ${format(parseISO(selectedCard.session.ends_at), 'h:mm a')}`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instructor</p>
                  <p className="font-medium">{selectedCard.instructor?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedCard.student?.full_name || 'N/A'}</p>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-8 w-8 text-primary" />
                  <span className="text-4xl font-bold">{selectedCard.overall || '-'}</span>
                  <span className="text-2xl text-muted-foreground">/10</span>
                </div>
              </div>

              {/* Rating Categories */}
              <div>
                <h4 className="font-medium mb-3">Skill Ratings</h4>
                <div className="grid gap-2">
                  {RATING_CATEGORIES.filter(cat => cat.key !== 'overall').map(category => {
                    const rating = selectedCard[category.key as keyof ReportCard] as number | null;
                    return (
                      <div key={category.key} className="flex items-center gap-3">
                        <span className="text-sm w-40">{category.label}</span>
                        <div className="flex-1">
                          <Progress 
                            value={rating ? rating * 10 : 0} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {rating || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audio Link */}
              {selectedCard.lesson_audio_url && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="font-medium">Lesson Audio</span>
                  </div>
                  <a 
                    href={selectedCard.lesson_audio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Listen to Recording
                  </a>
                </div>
              )}

              {/* Transcription */}
              {selectedCard.transcription_summary && (
                <div>
                  <h4 className="font-medium mb-2">Lesson Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedCard.transcription_summary}
                  </p>
                </div>
              )}

              {/* Message to Student */}
              {selectedCard.message_to_student && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">Instructor's Message</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedCard.message_to_student}</p>
                </div>
              )}

              {/* Internal Message (staff/admin only) */}
              {canSeeInternalMessage && selectedCard.internal_message && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Internal Notes (Staff Only)</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedCard.internal_message}</p>
                </div>
              )}

              {/* Edit Button */}
              {onEdit && (userRole === 'instructor' || userRole === 'staff' || userRole === 'admin') && (
                <Button onClick={() => { onEdit(selectedCard); setSelectedCard(null); }} className="w-full">
                  Edit Report Card
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
