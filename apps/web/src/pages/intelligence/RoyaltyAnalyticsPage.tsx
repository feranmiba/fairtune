import React, { useState, useEffect } from 'react';
import {
  intelligenceApi,
  EarningsSummary,
  SimulationResult,
  ForecastResult,
} from '../../api/intelligence.api';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Tabs } from '../../design-system/Tabs';
import { Alert } from '../../design-system/Alert';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../design-system/Table';
import {
  TrendingUp,
  Coins,
  Calculator,
  Sparkles,
  PieChart,
  ShieldAlert,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const RoyaltyAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('earnings');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);

  // Split Simulator State
  const [simTitle, setSimTitle] = useState('Streaming & Sync Model');
  const [simGross, setSimGross] = useState('10000');
  const [simRecouped, setSimRecouped] = useState('1500');
  const [simAllocations, setSimAllocations] = useState([
    { collaboratorName: 'Lead Artist', role: 'Artist', percentage: 50 },
    { collaboratorName: 'Marcus Vance', role: 'Producer', percentage: 30 },
    { collaboratorName: 'Elena Song', role: 'Songwriter', percentage: 20 },
  ]);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Forecasting State
  const [forecastGrowth, setForecastGrowth] = useState('5');
  const [forecastPeriods, setForecastPeriods] = useState('6');
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingEarnings(true);
      try {
        const data = await intelligenceApi.getEarningsSummary();
        setEarnings(data);
      } finally {
        setIsLoadingEarnings(false);
      }
    };
    load();
  }, []);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await intelligenceApi.simulate({
        grossRevenue: parseFloat(simGross) || 0,
        recoupableExpenses: parseFloat(simRecouped) || 0,
        currency: 'USD',
        participants: simAllocations,
      });
      setSimResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForecasting(true);
    try {
      // Use verified earnings or baseline sample for forward mathematical modeling
      const res = await intelligenceApi.forecast({
        title: '6-Month Projection',
        currency: 'USD',
        historicalPeriods: [
          { period: 'Month 1', actualGrossRevenue: 3200, actualRecouped: 400 },
          { period: 'Month 2', actualGrossRevenue: 3800, actualRecouped: 400 },
          { period: 'Month 3', actualGrossRevenue: 4400, actualRecouped: 300 },
        ],
        participants: [
          { collaboratorName: 'Lead Artist', role: 'Artist', percentage: 50 },
          { collaboratorName: 'Marcus Vance', role: 'Producer', percentage: 30 },
          { collaboratorName: 'Elena Song', role: 'Songwriter', percentage: 20 },
        ],
        projectedGrowthRatePercent: parseFloat(forecastGrowth) || 0,
        projectionPeriodsCount: parseInt(forecastPeriods, 10) || 6,
      });
      setForecastResult(res);
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border-subtle">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-gold" />
          Royalty Intelligence &amp; Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical earnings aggregated from confirmed Stellar payments, scenario simulations, and
          mathematical forecasting.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'earnings', label: 'Verified Historical Earnings' },
          { id: 'simulator', label: 'Revenue Split Simulator' },
          { id: 'forecasting', label: 'Forward Projections & Modeling' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Verified Earnings */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          {isLoadingEarnings ? (
            <div className="h-64 flex items-center justify-center text-brand-gold">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Top Earnings Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="elevated">
                  <div className="text-xs text-slate-400">Total Net Distributed</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    $
                    {(earnings?.totalHistoricalNetDistributed ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Confirmed payouts from active smart contracts
                  </p>
                </Card>

                <Card variant="elevated">
                  <div className="text-xs text-slate-400">Total Gross Royalty Inflows</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    $
                    {(earnings?.totalHistoricalGross ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total revenue deposited into escrow
                  </p>
                </Card>

                <Card variant="elevated">
                  <div className="text-xs text-slate-400">Total Recouped Expenses</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    $
                    {(earnings?.totalHistoricalRecouped ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deducted prior to split distribution
                  </p>
                </Card>
              </div>

              {/* By Track and By Collaborator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Earnings by Track</CardTitle>
                  </CardHeader>
                  {!earnings?.byTrack || earnings.byTrack.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center italic">
                      No track earnings recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border-subtle/50 text-xs">
                      {earnings.byTrack.map((t, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between items-center">
                          <span className="font-semibold text-slate-200">{t.trackTitle}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            ${Number(t.totalEarnings || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Earnings by Collaborator</CardTitle>
                  </CardHeader>
                  {!earnings?.byCollaborator || earnings.byCollaborator.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center italic">
                      No collaborator payouts recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border-subtle/50 text-xs">
                      {earnings.byCollaborator.map((c, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between items-center">
                          <span className="font-semibold text-slate-200">{c.collaboratorName}</span>
                          <span className="font-mono text-brand-gold font-bold">
                            ${Number(c.totalEarnings || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Split Simulator */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-brand-stellar" />
                  <CardTitle className="text-sm">Split Scenario Parameters</CardTitle>
                </div>
              </CardHeader>

              <form onSubmit={handleRunSimulation} className="space-y-4 text-xs">
                <Input
                  label="Scenario Title"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Gross Revenue ($)"
                    type="number"
                    min="1"
                    value={simGross}
                    onChange={(e) => setSimGross(e.target.value)}
                    required
                  />
                  <Input
                    label="Recoupable Expenses ($)"
                    type="number"
                    min="0"
                    value={simRecouped}
                    onChange={(e) => setSimRecouped(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block mb-2">
                    Participant Percentages
                  </span>
                  <div className="space-y-2">
                    {simAllocations.map((alloc, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Name"
                          value={alloc.collaboratorName}
                          onChange={(e) => {
                            const updated = [...simAllocations];
                            updated[idx].collaboratorName = e.target.value;
                            setSimAllocations(updated);
                          }}
                        />
                        <div className="w-24 shrink-0">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={alloc.percentage}
                            onChange={(e) => {
                              const updated = [...simAllocations];
                              updated[idx].percentage = parseFloat(e.target.value) || 0;
                              setSimAllocations(updated);
                            }}
                          />
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={isSimulating}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Calculate Distribution
                </Button>
              </form>
            </Card>

            {/* Simulation Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-brand-gold" />
                  <CardTitle className="text-sm">Distribution Breakdown</CardTitle>
                </div>
              </CardHeader>

              {!simResult ? (
                <div className="py-12 text-center text-xs text-slate-500 italic">
                  Run simulation to view exact collaborator split payouts.
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-subtle flex justify-between items-center font-mono">
                    <span className="text-slate-400">Net Distributable:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      ${Number(simResult.distributableRevenue || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {simResult.allocations.map((alloc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-surface-elevated/60 border border-border-subtle flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            {alloc.collaboratorName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {alloc.percentage}% share
                          </div>
                        </div>
                        <div className="font-mono font-bold text-brand-gold text-sm">
                          ${Number(alloc.amount || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: Forward Forecasting */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Truth in Data Guarantee:</strong> Forward projections are mathematical trend
              models derived from past performance. They do not constitute guaranteed future revenue
              or investment advice.
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Model Parameters</CardTitle>
            </CardHeader>

            <form
              onSubmit={handleRunForecast}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-end"
            >
              <Input
                label="Projected Growth Rate (% per period)"
                type="number"
                step="0.5"
                value={forecastGrowth}
                onChange={(e) => setForecastGrowth(e.target.value)}
                required
              />
              <Input
                label="Forecast Duration (Periods)"
                type="number"
                min="1"
                max="24"
                value={forecastPeriods}
                onChange={(e) => setForecastPeriods(e.target.value)}
                required
              />
              <Button type="submit" variant="stellar" isLoading={isForecasting}>
                Generate Forward Model
              </Button>
            </form>
          </Card>

          {forecastResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="elevated">
                  <div className="text-xs text-slate-400">Cumulative Projected Gross</div>
                  <div className="text-2xl font-bold font-mono text-brand-stellar mt-1">
                    $
                    {forecastResult.forwardEstimates.cumulativeProjectedGrossRevenue.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 },
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={forecastResult.confidenceLevel === 'HIGH' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {forecastResult.confidenceLevel} CONFIDENCE ({forecastResult.confidenceScore}
                      %)
                    </Badge>
                  </div>
                </Card>

                <Card variant="elevated">
                  <div className="text-xs text-slate-400">Historical Analyzed Periods</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {forecastResult.historicalFacts.periodsAnalyzed} Months
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Average gross: $
                    {Number(forecastResult.historicalFacts.averageHistoricalGrossPerPeriod || 0).toFixed(2)}/mo
                  </p>
                </Card>
              </div>

              {/* Projected Splits Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Projected Cumulative Payouts by Collaborator
                  </CardTitle>
                </CardHeader>

                <div className="divide-y divide-border-subtle/50 text-xs">
                  {forecastResult.forwardEstimates.participantProjectedTotals.map((part, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200">
                          {part.collaboratorName}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] block">
                          {part.percentage}% allocation
                        </span>
                      </div>
                      <div className="font-mono font-bold text-brand-gold text-sm">
                        ${Number(part.cumulativeProjectedEarnings || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
