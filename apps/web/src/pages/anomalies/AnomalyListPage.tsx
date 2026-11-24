import React, { useState, useEffect } from 'react';
import { intelligenceApi, AnomalyWithReview } from '../../api/intelligence.api';
import { AnomalySeverity, AnomalyReviewStatus } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Dialog } from '../../design-system/Dialog';
import { Input } from '../../design-system/Input';
import { Alert } from '../../design-system/Alert';
import { EmptyState } from '../../design-system/EmptyState';
import {
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileSearch,
  Loader2,
  Filter,
} from 'lucide-react';

export const AnomalyListPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyWithReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyWithReview | null>(null);
  const [reviewStatus, setReviewStatus] = useState<AnomalyReviewStatus>(
    AnomalyReviewStatus.RESOLVED,
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadAnomalies = async () => {
    setIsLoading(true);
    try {
      const res = await intelligenceApi.listAnomalies();
      setAnomalies(res.anomalies || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const handleOpenReview = (anomaly: AnomalyWithReview) => {
    setSelectedAnomaly(anomaly);
    setReviewStatus(AnomalyReviewStatus.RESOLVED);
    setReviewNotes('');
    setReviewError(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      await intelligenceApi.reviewAnomaly(selectedAnomaly.id, {
        status: reviewStatus,
        notes: reviewNotes.trim() || undefined,
      });
      setSelectedAnomaly(null);
      await loadAnomalies();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filtered = anomalies.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.reviewStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-amber-400" />
            Payment Reconciliation &amp; Anomaly Review
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated mathematical discrepancy detection across agreements, escrows, and on-chain
            distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="stellar" className="font-mono text-xs">
            {anomalies.filter((a) => a.reviewStatus === AnomalyReviewStatus.PENDING).length} Pending
            Findings
          </Badge>
        </div>
      </div>

      {/* Neutral Language Disclaimer */}
      <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-border-subtle text-xs text-slate-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-brand-stellar shrink-0" />
        <span>
          <strong>Objective Audit Principle:</strong> Anomaly detection flags mathematical variances
          between agreement basis points and payment amounts. Findings indicate discrepancies
          requiring investigation, not accusations of fraud.
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Severity:</span>
          {[
            'ALL',
            AnomalySeverity.CRITICAL,
            AnomalySeverity.HIGH,
            AnomalySeverity.MEDIUM,
            AnomalySeverity.LOW,
          ].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                severityFilter === s
                  ? 'bg-surface-elevated text-slate-100 font-semibold border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-l border-border-subtle pl-4">
          <span className="text-slate-400">Status:</span>
          {[
            'ALL',
            AnomalyReviewStatus.PENDING,
            AnomalyReviewStatus.IN_REVIEW,
            AnomalyReviewStatus.RESOLVED,
            AnomalyReviewStatus.FALSE_POSITIVE,
          ].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-surface-elevated text-slate-100 font-semibold border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Anomaly Cards List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-brand-gold">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          title="No anomalies detected"
          description="All royalty agreements and payment distributions match expected deterministic mathematical invariants."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((anomaly) => (
            <Card key={anomaly.id} variant="elevated">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant={
                      anomaly.severity === AnomalySeverity.CRITICAL
                        ? 'danger'
                        : anomaly.severity === AnomalySeverity.HIGH
                          ? 'warning'
                          : 'default'
                    }
                    size="sm"
                  >
                    {anomaly.severity}
                  </Badge>
                  <h3 className="text-sm font-semibold text-slate-100 font-mono">
                    {anomaly.anomalyType.replace(/_/g, ' ')}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    Status: <strong className="text-slate-200">{anomaly.reviewStatus}</strong>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => handleOpenReview(anomaly)}>
                    Review Finding
                  </Button>
                </div>
              </div>

              {/* Finding Body */}
              <div className="space-y-3 text-xs">
                {anomaly.aiExplanation && (
                  <div className="p-3 rounded-lg bg-surface border border-border-subtle text-slate-200 leading-relaxed">
                    <strong className="text-slate-100 block mb-1">Objective Analysis:</strong>
                    {anomaly.aiExplanation}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-400 pt-1 font-mono text-[11px]">
                  <div>
                    <span>Observed Value:</span>
                    <span className="block font-semibold text-slate-200 mt-0.5">
                      {anomaly.observedValue ? `$${anomaly.observedValue}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span>Expected Value:</span>
                    <span className="block font-semibold text-slate-200 mt-0.5">
                      {anomaly.expectedValue ? `$${anomaly.expectedValue}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span>Detection Reason:</span>
                    <span className="block font-semibold text-amber-400 mt-0.5 truncate">
                      {anomaly.detectionReason || 'Variance'}
                    </span>
                  </div>
                  <div>
                    <span>Detected At:</span>
                    <span className="block font-semibold text-slate-200 mt-0.5">
                      {new Date(anomaly.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Audit Review History (if reviewed) */}
                {anomaly.reviews && anomaly.reviews.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border-subtle/80 space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Audit Review Log
                    </span>
                    {anomaly.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2 rounded bg-surface/40 text-[11px] text-slate-300"
                      >
                        <span className="font-semibold text-emerald-400">{rev.newStatus}:</span>{' '}
                        {rev.notes || 'Status updated'} &bull;{' '}
                        <span className="text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog
        isOpen={!!selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        title="Review Audit Finding"
        description="Record investigative notes and update the reconciliation finding status."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSelectedAnomaly(null)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitReview} isLoading={isSubmittingReview}>
              Save Review
            </Button>
          </>
        }
      >
        {reviewError && (
          <Alert variant="danger" title="Error" className="mb-4">
            {reviewError}
          </Alert>
        )}

        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">Update Finding Status</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as AnomalyReviewStatus)}
              className="w-full bg-surface text-slate-100 border border-border-subtle rounded-lg text-sm p-2.5 focus:outline-none focus:border-brand-stellar"
            >
              <option value={AnomalyReviewStatus.RESOLVED}>
                Resolved (Discrepancy resolved/accounted for)
              </option>
              <option value={AnomalyReviewStatus.IN_REVIEW}>
                In Review (Investigation underway)
              </option>
              <option value={AnomalyReviewStatus.FALSE_POSITIVE}>
                False Positive (Expected discrepancy per contract terms)
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">Audit Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Confirmed variance was due to producer advance recoupment prior to streaming payout."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full bg-surface text-slate-100 placeholder:text-slate-500 border border-border-subtle rounded-lg text-sm p-3 focus:outline-none focus:border-brand-stellar"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
