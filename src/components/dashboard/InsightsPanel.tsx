import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInsights } from '@/hooks/useInsights';
import { Lightbulb, AlertCircle, AlertTriangle, Info, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { InsightRecord } from '@/services/insightService';
import { useState } from 'react';

export default function InsightsPanel() {
  const { insights, stats, loading, tableExists, acknowledge, triggerProcessing } = useInsights();
  const [processing, setProcessing] = useState(false);

  // Hide panel if table doesn't exist (migration not run)
  if (tableExists === false) {
    return null;
  }

  const severityConfig = {
    low: {
      icon: Info,
      className: 'text-info border-info/20 bg-info/10',
      badgeClassName: 'bg-info/10 text-info border-info/20',
    },
    medium: {
      icon: AlertTriangle,
      className: 'text-warning border-warning/20 bg-warning/10',
      badgeClassName: 'bg-warning/10 text-warning border-warning/20',
    },
    high: {
      icon: AlertCircle,
      className: 'text-destructive border-destructive/20 bg-destructive/10',
      badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const handleProcessInsights = async (enableAI: boolean = false) => {
    setProcessing(true);
    try {
      await triggerProcessing(enableAI);
    } finally {
      setProcessing(false);
    }
  };

  const formatInsightType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights & Analytics
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleProcessInsights(false)}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Process
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{stats.unacknowledged}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-warning">{stats.by_severity.medium + stats.by_severity.high}</p>
              <p className="text-xs text-muted-foreground">Important</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}

        {/* Insights List */}
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No insights available</p>
            <p className="text-sm text-muted-foreground">
              Click "Process" to analyze HR data patterns
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.slice(0, 5).map((insight: InsightRecord) => {
              const config = severityConfig[insight.severity];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${config.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <Badge variant="outline" className={config.badgeClassName}>
                          {insight.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatInsightType(insight.insight_type)}
                        </span>
                      </div>
                      <h4 className="font-semibold">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.summary}</p>
                      {insight.explanation && (
                        <div className="mt-2 p-2 rounded bg-background/50 border border-border/50">
                          <p className="text-xs text-muted-foreground italic">
                            {insight.explanation}
                          </p>
                          {insight.is_ai_enhanced && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              AI-enhanced explanation
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(insight.created_at), 'MMM d, h:mm a')}</span>
                        {insight.affected_user_ids.length > 0 && (
                          <span>{insight.affected_user_ids.length} employee(s) affected</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledge(insight.id)}
                      className="shrink-0"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {insights.length > 5 && (
              <p className="text-sm text-center text-muted-foreground">
                +{insights.length - 5} more insight(s)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

