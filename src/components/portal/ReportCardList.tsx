import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReportCard, RATING_CATEGORIES } from "@/types/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileText, Calendar, User, Star, MessageSquare, Clock, ExternalLink, Copy, Check, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getDisplayName } from "@/lib/profileUtils";
import { useToast } from "@/hooks/use-toast";
import { ReportCardStatusBadge } from "@/pages/portal/ReportCardForm";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useSkillLabel } from "@/i18n/skills";

interface ReportCardListProps {
  reportCards: ReportCard[];
  userRole: 'student' | 'instructor' | 'staff' | 'admin';
  onEdit?: (reportCard: ReportCard) => void;
}

export function ReportCardList({ reportCards, userRole, onEdit }: ReportCardListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const skillLabel = useSkillLabel();
  const [selectedCard, setSelectedCard] = useState<ReportCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [sessionTypeMap, setSessionTypeMap] = useState<Record<string, string>>({});
  const [roadTestResultMap, setRoadTestResultMap] = useState<Record<string, string>>({});

  // Fetch session types and road test results for all report cards
  useEffect(() => {
    const sessionIds = [...new Set(reportCards.map(rc => rc.session_id).filter(Boolean))];
    if (sessionIds.length === 0) return;

    const fetchSessionTypes = async () => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, session_type")
        .in("id", sessionIds);
      
      if (sessions) {
        const map: Record<string, string> = {};
        sessions.forEach(s => { map[s.id] = s.session_type; });
        setSessionTypeMap(map);

        // Fetch road test results for testing sessions
        const testingSessionIds = sessions.filter(s => s.session_type === 'testing').map(s => s.id);
        if (testingSessionIds.length > 0) {
          const { data: rtResults } = await supabase
            .from("road_test_results")
            .select("session_id, result")
            .in("session_id", testingSessionIds);
          if (rtResults) {
            const rtMap: Record<string, string> = {};
            rtResults.forEach(r => { rtMap[r.session_id] = r.result; });
            setRoadTestResultMap(rtMap);
          }
        }
      }
    };
    fetchSessionTypes();
  }, [reportCards]);

  const isRoadTest = (card: ReportCard) => sessionTypeMap[card.session_id] === 'testing';

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'bg-muted';
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 6) return 'bg-yellow-500';
    if (rating >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleCopyLink = async (reportCardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/report-cards/${reportCardId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Report card link copied. Recipient must sign in to view.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenReportCard = (card: ReportCard) => {
    if (isRoadTest(card)) {
      // Route to road test result splash
      navigate(`/road-test-results/open/${card.session_id}`);
    } else {
      navigate(`/report-cards/open/${card.id}`);
    }
  };

  const canSeeInternalMessage = userRole === 'staff' || userRole === 'admin';
  const canCopyLink = userRole === 'staff' || userRole === 'admin' || userRole === 'instructor';

  return (
    <div className="space-y-4">

      {reportCards.length === 0 ? (
        <Card className="portal-card">
          <CardContent className="py-8 sm:py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">{t('report.noReports')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {reportCards.map(card => (
            <Card 
              key={card.id} 
              className="portal-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedCard(card)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm truncate">
                        {card.session?.starts_at 
                          ? format(parseISO(card.session.starts_at), 'MMM d, yyyy')
                          : format(parseISO(card.created_at), 'MMM d, yyyy')
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground truncate">
                        {userRole === 'student' 
                          ? getDisplayName(card.instructor, t('common.instructor'))
                          : getDisplayName(card.student, t('common.student'))}
                      </span>
                    </div>
                    {/* Show submitted timestamp */}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {t('common.submitted')}: {format(parseISO(card.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                {isRoadTest(card) ? (
                    <Badge className={`${roadTestResultMap[card.session_id] === 'passed' ? 'bg-green-500' : 'bg-orange-500'} text-xs shrink-0 text-white`}>
                      {roadTestResultMap[card.session_id] === 'passed' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />{t('report.passed').replace(' 🚀', '')}</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />{t('report.mustRetry')}</>
                      )}
                    </Badge>
                  ) : (
                    <Badge className={`${getRatingColor(card.overall)} text-xs shrink-0`}>
                      <Star className="h-3 w-3 mr-1" />
                      {card.overall || '-'}/10
                    </Badge>
                  )}
                  {card.report_card_status && card.report_card_status !== 'completed' && (
                    <ReportCardStatusBadge status={card.report_card_status} />
                  )}
                </div>
                
                {card.message_to_student && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                    {card.message_to_student}
                  </p>
                )}
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReportCard(card);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                  {canCopyLink && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-xs h-8"
                      onClick={(e) => handleCopyLink(card.id, e)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="w-[min(92vw,640px)] max-w-[640px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5" />
              {selectedCard && isRoadTest(selectedCard) ? "Road Test Details" : "Report Card Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCard && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-sm sm:text-base">
                    {selectedCard.session?.starts_at 
                      ? format(parseISO(selectedCard.session.starts_at), 'MMMM d, yyyy')
                      : format(parseISO(selectedCard.created_at), 'MMMM d, yyyy')
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                  <p className="font-medium text-sm sm:text-base">
                    {selectedCard.session?.starts_at 
                      ? `${format(parseISO(selectedCard.session.starts_at), 'h:mm a')} - ${format(parseISO(selectedCard.session.ends_at), 'h:mm a')}`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Instructor</p>
                  <p className="font-medium text-sm sm:text-base truncate">{getDisplayName(selectedCard.instructor, 'N/A')}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Student</p>
                  <p className="font-medium text-sm sm:text-base truncate">{getDisplayName(selectedCard.student, 'N/A')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm sm:text-base">{format(parseISO(selectedCard.created_at), 'MMMM d, yyyy h:mm a')}</p>
                </div>
              </div>

              {isRoadTest(selectedCard) ? (
                <>
                  {/* Road Test Result */}
                  <div className={`text-center p-6 rounded-xl ${roadTestResultMap[selectedCard.session_id] === 'passed' ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                    {roadTestResultMap[selectedCard.session_id] === 'passed' ? (
                      <>
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
                        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Passed 🚀</h2>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-12 w-12 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                        <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Must Retry</h2>
                      </>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedCard.message_to_student && (
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium text-sm">Road Test Notes</span>
                      </div>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedCard.message_to_student}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Overall Rating */}
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Overall Rating</p>
                    <div className="flex items-center justify-center gap-2">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                      <span className="text-3xl sm:text-4xl font-bold">{selectedCard.overall || '-'}</span>
                      <span className="text-xl sm:text-2xl text-muted-foreground">/10</span>
                    </div>
                  </div>

                  {/* Rating Categories */}
                  <div>
                    <h4 className="font-medium mb-3 text-sm sm:text-base">Skill Ratings</h4>
                    <div className="grid gap-2">
                      {RATING_CATEGORIES.filter(cat => cat.key !== 'overall').map(category => {
                        const rating = selectedCard[category.key as keyof ReportCard] as number | null;
                        return (
                          <div key={category.key} className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm w-28 sm:w-40 truncate">{category.label}</span>
                            <div className="flex-1">
                              <Progress 
                                value={rating ? rating * 10 : 0} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right">
                              {rating || '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transcription */}
                  {selectedCard.transcription_summary && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">Lesson Summary</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedCard.transcription_summary}
                      </p>
                    </div>
                  )}

                  {/* Message to Student */}
                  {selectedCard.message_to_student && (
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium text-sm">Instructor's Message</span>
                      </div>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedCard.message_to_student}</p>
                    </div>
                  )}
                </>
              )}

              {/* Internal Message (staff/admin only) */}
              {canSeeInternalMessage && selectedCard.internal_message && (
                <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm text-destructive">Internal Notes (Staff Only)</span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedCard.internal_message}</p>
                </div>
              )}

              {/* Edit Button - only for driving reports */}
              {onEdit && !isRoadTest(selectedCard) && (userRole === 'instructor' || userRole === 'staff' || userRole === 'admin') && (
                <Button onClick={() => { onEdit(selectedCard); setSelectedCard(null); }} className="w-full min-h-[44px]">
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