import React, { useState, useEffect } from 'react';
import { paymentsApi, PaymentsResponse } from '../../api/payments.api';
import { PaymentStatus } from '@fairtune/shared';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../design-system/Table';
import { EmptyState } from '../../design-system/EmptyState';
import { CreditCard, ExternalLink, Loader2, Coins, CheckCircle2 } from 'lucide-react';

export const PaymentHistoryPage: React.FC = () => {
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await paymentsApi.list();
        setPaymentsData(data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-brand-gold">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const payments = paymentsData?.payments || [];
  const confirmedCount = payments.filter((p) => p.status === PaymentStatus.CONFIRMED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Payment History &amp; Settlements
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed on-chain distributions synchronized directly from Stellar ledger checkpoints.
          </p>
        </div>

        <Badge variant="stellar" className="font-mono text-xs">
          {confirmedCount} Confirmed On-Chain Payouts
        </Badge>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Coins className="w-6 h-6" />}
          title="No royalty payments recorded yet"
          description="When your active agreements receive escrow deposits and distribute splits, confirmed settlements will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Settlement Records</CardTitle>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Agreement / Track</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Explorer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((pmt) => (
                <TableRow key={pmt.id}>
                  <TableCell className="font-semibold text-slate-200">
                    Royalty Distribution
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-200">
                      {pmt.agreement?.title || 'Royalty Agreement'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-brand-gold">
                      {pmt.asset?.code || 'XLM'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-emerald-400">
                    +${Number(pmt.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pmt.status === PaymentStatus.CONFIRMED ? 'success' : 'warning'}
                      size="sm"
                    >
                      {pmt.status === PaymentStatus.CONFIRMED && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {pmt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">
                    {new Date(pmt.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {pmt.transactionHash ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${pmt.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-stellar hover:underline inline-flex items-center gap-1 text-xs font-mono"
                      >
                        {pmt.transactionHash.substring(0, 8)}...{' '}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 font-mono text-xs">Pending ledger</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
