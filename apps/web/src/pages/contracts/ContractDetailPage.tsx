import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  analysisApi,
  AnalysisSummaryWithClauses,
  ContractClauseItem,
} from '../../api/analysis.api';
import { documentsApi } from '../../api/documents.api';
import { DocumentDto, RiskLevel } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Alert } from '../../design-system/Alert';
import { Tabs } from '../../design-system/Tabs';
import { EmptyState } from '../../design-system/EmptyState';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  ArrowLeft,
  Sparkles,
  Loader2,
  BookOpen,
} from 'lucide-react';

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [document, setDocument] = useState<DocumentDto | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisSummaryWithClauses | null>(null);
  const [clauses, setClauses] = useState<ContractClauseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const doc = await documentsApi.getById(id);
        setDocument(doc);

        try {
          const an = await analysisApi.getByDocumentId(id);
          setAnalysis(an);
          if (an.id) {
            const cls = await analysisApi.getClauses(an.id);
            setClauses(cls);
          }
        } catch {
          // Analysis may not have run yet
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleRunAnalysis = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    try {
      const an = await analysisApi.triggerAnalysis(id);
      setAnalysis(an as AnalysisSummaryWithClauses);
      if (an.id) {
        const cls = await analysisApi.getClauses(an.id);
        setClauses(cls);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-brand-gold">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-slate-100">Contract not found</h2>
        <Link to="/contracts" className="mt-4 inline-block">
          <Button size="sm" variant="secondary">
            Return to contract vault
          </Button>
        </Link>
      </div>
    );
  }

  const result = analysis?.analysisResult;
  const categories = Array.from(new Set(clauses.map((c) => c.category)));
  const filteredClauses =
    selectedCategory === 'ALL' ? clauses : clauses.filter((c) => c.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Link to="/contracts">
            <Button size="sm" variant="ghost" className="p-2 h-auto" aria-label="Back to contracts">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100">{document.title}</h1>
              {analysis?.overallRiskLevel && (
                <Badge
                  variant={
                    analysis.overallRiskLevel === RiskLevel.CRITICAL
                      ? 'danger'
                      : analysis.overallRiskLevel === RiskLevel.HIGH
                        ? 'warning'
                        : 'success'
                  }
                  size="sm"
                >
                  {analysis.overallRiskLevel} RISK
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {document.originalFileName} &bull; Status: {document.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to={`/contracts/chat?docId=${document.id}`}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<MessageSquare className="w-3.5 h-3.5 text-brand-gold" />}
            >
              Ask AI Assistant
            </Button>
          </Link>

          {!analysis && (
            <Button
              size="sm"
              variant="stellar"
              isLoading={isAnalyzing}
              onClick={handleRunAnalysis}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Analyze Contract
            </Button>
          )}
        </div>
      </div>

      {/* Legal Notice Disclaimer Banner */}
      <div className="p-3 rounded-lg bg-surface-elevated/70 border border-border-subtle flex items-center gap-2.5 text-xs text-slate-400">
        <BookOpen className="w-4 h-4 text-brand-gold shrink-0" />
        <span>
          FairTune provides automated analysis and clause extraction for educational reference. It
          does not provide formal legal representation.
        </span>
      </div>

      {/* If No Analysis Available Yet */}
      {!analysis && (
        <Card className="text-center py-12 space-y-4">
          <ShieldAlert className="w-12 h-12 text-brand-gold mx-auto" />
          <h3 className="text-base font-semibold text-slate-100">No AI analysis generated yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run contract intelligence to extract ownership terms, royalty allocations, and predatory
            clauses.
          </p>
          <Button
            variant="primary"
            isLoading={isAnalyzing}
            onClick={handleRunAnalysis}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Start analysis now
          </Button>
        </Card>
      )}

      {/* Analysis Tabs */}
      {analysis && (
        <>
          <Tabs
            tabs={[
              { id: 'summary', label: 'Executive Summary' },
              { id: 'clauses', label: 'Extracted Clauses', badge: clauses.length },
              {
                id: 'risks',
                label: 'Risk Findings & Red Flags',
                badge: result?.redFlags?.length || 0,
              },
              { id: 'splits', label: 'Detected Splits' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab 1: Executive Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Contract Synthesis</CardTitle>
                </CardHeader>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {analysis.summary || 'Summary generation complete.'}
                </p>
              </Card>

              {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Contract Parties</CardTitle>
                    </CardHeader>
                    <div className="space-y-2 text-xs">
                      {result.partiesInvolved?.map((party, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded bg-surface-elevated border border-border-subtle flex justify-between"
                        >
                          <span className="font-medium text-slate-200">{party}</span>
                          <span className="text-slate-400 font-mono">Party #{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Term &amp; Jurisdiction</CardTitle>
                    </CardHeader>
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="p-2.5 rounded bg-surface-elevated border border-border-subtle">
                        <span className="text-slate-400 block text-[11px]">Contract Term:</span>
                        <span className="font-semibold">
                          {result.contractTerm || 'Not explicitly stated'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-surface-elevated border border-border-subtle">
                        <span className="text-slate-400 block text-[11px]">Jurisdiction:</span>
                        <span className="font-semibold">
                          {result.governingJurisdiction || 'Standard commercial'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Extracted Clauses */}
          {activeTab === 'clauses' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-brand-gold text-canvas font-semibold'
                      : 'bg-surface-elevated text-slate-300 hover:bg-surface-hover'
                  }`}
                >
                  All ({clauses.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-brand-gold text-canvas font-semibold'
                        : 'bg-surface-elevated text-slate-300 hover:bg-surface-hover'
                    }`}
                  >
                    {cat} ({clauses.filter((c) => c.category === cat).length})
                  </button>
                ))}
              </div>

              {filteredClauses.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-6 h-6" />}
                  title="No clauses match filter"
                  description="Try selecting a different clause category."
                />
              ) : (
                <div className="space-y-3">
                  {filteredClauses.map((clause) => (
                    <Card key={clause.id} variant="elevated">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100">
                            {clause.title}
                          </span>
                          <Badge variant="default" size="sm" className="font-mono text-[10px]">
                            {clause.category}
                          </Badge>
                        </div>
                        {clause.pageNumber && (
                          <span className="text-[11px] font-mono text-slate-400">
                            Page {clause.pageNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-mono bg-canvas/40 p-3 rounded border border-border-subtle leading-relaxed whitespace-pre-wrap">
                        {clause.text}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Risk Findings */}
          {activeTab === 'risks' && (
            <div className="space-y-4">
              {!result?.redFlags || result.redFlags.length === 0 ? (
                <Alert variant="success" title="No high-severity red flags identified">
                  The initial AI analysis did not detect standard predatory traps in this contract.
                </Alert>
              ) : (
                result.redFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Identified Risk #{idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed pl-6">{flag}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Detected Splits */}
          {activeTab === 'splits' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Royalty Allocations</CardTitle>
                </CardHeader>
                {!result?.detectedRoyaltySplits || result.detectedRoyaltySplits.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">
                    No explicit split percentages identified in text.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.detectedRoyaltySplits.map((split, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 rounded-lg bg-surface-elevated border border-border-subtle text-xs"
                      >
                        <span className="font-medium text-slate-100">{split.beneficiary}</span>
                        <div className="text-right">
                          <span className="font-mono text-brand-gold font-bold">
                            {split.percentage}%
                          </span>
                          <span className="text-[11px] text-slate-400 block">{split.basis}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="text-center pt-2">
                <Link to="/agreements/create">
                  <Button variant="primary">
                    Turn these splits into a Stellar Soroban Agreement
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
