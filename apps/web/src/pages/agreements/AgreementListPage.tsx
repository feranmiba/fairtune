import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agreementsApi, AgreementWithCollaborators } from '../../api/agreements.api';
import { AgreementStatus } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { EmptyState } from '../../design-system/EmptyState';
import { Scale, Plus, ArrowRight, Loader2, Users } from 'lucide-react';

export const AgreementListPage: React.FC = () => {
  const [agreements, setAgreements] = useState<AgreementWithCollaborators[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const list = await agreementsApi.list();
        setAgreements(list);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered =
    statusFilter === 'ALL' ? agreements : agreements.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Royalty Agreements</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-party split agreements, collect on-chain collaborator signatures, and
            inspect Soroban escrows.
          </p>
        </div>

        <Link to="/agreements/create">
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New Royalty Split
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          'ALL',
          AgreementStatus.ACTIVE,
          AgreementStatus.PENDING_APPROVAL,
          AgreementStatus.DRAFT,
        ].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-brand-gold text-canvas font-semibold'
                : 'bg-surface-elevated text-slate-300 hover:bg-surface-hover'
            }`}
          >
            {status} (
            {status === 'ALL'
              ? agreements.length
              : agreements.filter((a) => a.status === status).length}
            )
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-brand-gold">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-6 h-6" />}
          title="No agreements found"
          description="Create a transparent royalty split with your collaborators to distribute streaming and licensing income."
          actionLabel="Create split agreement"
          onAction={() => navigate('/agreements/create')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agr) => (
            <Card
              key={agr.id}
              variant="interactive"
              className="flex flex-col justify-between"
              onClick={() => navigate(`/agreements/${agr.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border-subtle">
                  <div className="truncate">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">{agr.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Track: {agr.trackName}
                    </p>
                  </div>
                  <Badge
                    variant={
                      agr.status === AgreementStatus.ACTIVE
                        ? 'success'
                        : agr.status === AgreementStatus.PENDING_APPROVAL
                          ? 'warning'
                          : 'default'
                    }
                    size="sm"
                  >
                    {agr.status}
                  </Badge>
                </div>

                <div className="py-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Collaborators:
                    </span>
                    <span className="font-mono text-slate-200">
                      {agr.participants.length} parties
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span>Allocated Split:</span>
                    <span className="font-mono text-brand-gold font-bold">
                      {agr.totalAllocation}%
                    </span>
                  </div>

                  {agr.contractAddress && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Contract:</span>
                      <span className="font-mono text-brand-stellar text-[11px] truncate max-w-[140px]">
                        {agr.contractAddress.substring(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(agr.createdAt).toLocaleDateString()}
                </span>
                <span className="text-brand-gold font-medium flex items-center gap-1">
                  Manage split <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
