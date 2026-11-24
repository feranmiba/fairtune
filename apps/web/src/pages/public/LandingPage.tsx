import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../design-system/Button';
import {
  FileSearch,
  Scale,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  Cpu,
  Coins,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-12 sm:py-20">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-stellar-subtle border border-brand-stellar/30 text-brand-stellar text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-brand-stellar animate-pulse"></span>
          Stellar Soroban Hackathon Project
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
          Understand what you sign. <span className="text-brand-gold">Know what you own.</span>{' '}
          <span className="text-brand-stellar">Get what you're owed.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
          Music contracts are filled with perpetual rights grabs and obscure recoupment clauses.
          FairTune pairs contract intelligence with Stellar smart contracts so independent artists
          keep their masters and receive direct, auditable royalty distributions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link to="/register">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Review your contract free
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary">
              See how splits work
            </Button>
          </a>
        </div>

        {/* Value Proposition Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-border-subtle text-left">
          <div className="space-y-1">
            <span className="text-xs font-mono text-brand-gold">01. CONTRACT INTELLIGENCE</span>
            <h3 className="text-sm font-semibold text-slate-100">Plain-English clause breakdown</h3>
            <p className="text-xs text-slate-400">
              Flag 360-deals, cross-collateralization, and hidden distribution fees before signing.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono text-brand-stellar">02. ON-CHAIN SPLITS</span>
            <h3 className="text-sm font-semibold text-slate-100">10,000 basis points precision</h3>
            <p className="text-xs text-slate-400">
              Soroban smart contracts enforce collaborative splits. Every collaborator signs
              on-chain.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono text-emerald-400">03. NON-CUSTODIAL ESCROW</span>
            <h3 className="text-sm font-semibold text-slate-100">Direct wallet payouts</h3>
            <p className="text-xs text-slate-400">
              Revenue deposits release immediately to collaborator Stellar addresses with zero
              remainder leakage.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            From confusing PDF to confirmed on-chain payout
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            FairTune replaces backroom accounting with open, auditable smart contract automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-gold font-mono font-bold">
              1
            </div>
            <h3 className="text-base font-semibold text-slate-100">Upload contract</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your recording, publishing, or producer contract in PDF format.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-stellar font-mono font-bold">
              2
            </div>
            <h3 className="text-base font-semibold text-slate-100">Identify risks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI maps clauses to original page excerpts and flags predatory terms and royalty
              shares.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-emerald-400 font-mono font-bold">
              3
            </div>
            <h3 className="text-base font-semibold text-slate-100">Create split</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define exact collaborator allocations. Submit to Stellar testnet for multi-party
              signature.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-purple-400 font-mono font-bold">
              4
            </div>
            <h3 className="text-base font-semibold text-slate-100">Receive royalties</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When escrow receives funds, Soroban distributes shares directly to each collaborator's
              wallet.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Focus: Contract AI */}
      <section id="contract-intelligence" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-brand-gold text-xs font-mono">
              <Cpu className="w-3.5 h-3.5" />
              Grounded AI Analysis
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">
              Never sign away your masters in the dark
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Traditional entertainment lawyers charge thousands per contract. FairTune's contract
              intelligence extracts every clause, classifies obligations, and grounds every risk
              assessment in actual page references.
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Page-accurate citations for every flagged risk and royalty allocation</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Detection of 360-rights, unrecouped debt roll-over, and territory locks</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Interactive AI assistant to ask clarifying questions about specific clauses
                </span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <span className="text-xs font-mono text-slate-400">Sample Contract Analysis</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 font-mono">
                HIGH RISK DETECTED
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-2">
              <div className="text-xs font-semibold text-slate-200">Master Recording Transfer</div>
              <p className="text-xs text-slate-400 font-mono italic">
                "...Artist assigns in perpetuity all rights, title, and master copyrights throughout
                the universe..."
              </p>
              <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/30">
                Warning: This clause transfers your complete copyright permanently without reversion
                rights.
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Source: Page 4, Paragraph 3(b)</span>
              <span className="text-brand-stellar font-mono">Confidence: 98%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Focus: Stellar Soroban */}
      <section id="soroban-royalties" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <span className="text-xs font-mono text-slate-400">
                Smart Contract Split Execution
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950/60 text-brand-stellar border border-cyan-800/40 font-mono">
                10,000 BPS VERIFIED
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="font-medium text-slate-200">Lead Artist (You)</span>
                <span className="font-mono text-brand-gold">50.00% (5,000 bps)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="font-medium text-slate-200">Producer (Marcus V.)</span>
                <span className="font-mono text-brand-gold">30.00% (3,000 bps)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="font-medium text-slate-200">Vocalist (Elena S.)</span>
                <span className="font-mono text-brand-gold">20.00% (2,000 bps)</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-between text-xs">
              <span className="text-slate-400">Escrow remainder guarantee</span>
              <span className="text-emerald-400 font-mono">0 Stroop Leakage</span>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-brand-stellar text-xs font-mono">
              <Coins className="w-3.5 h-3.5" />
              Stellar Blockchain Core
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">
              Mathematical certainty for every collaborator
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              No more waiting six months for opaque distributor accounting statements. Soroban smart
              contracts encode split percentages in basis points and release payments immediately
              when revenue hits escrow.
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Multi-party threshold approvals: all collaborators sign before activation
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero floating-point errors: exact integer stroop arithmetic</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Native XLM and Stellar USDC asset compatibility</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Trust & Non-Custodial Section */}
      <section id="trust" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle text-slate-300 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-brand-stellar" />
          Strict Non-Custodial Architecture
        </div>

        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-100">
          Your keys. Your music. Your money.
        </h2>

        <p className="max-w-2xl mx-auto text-sm text-slate-300 leading-relaxed">
          FairTune never asks for, receives, or stores private keys or seed phrases. Transactions
          are prepared by our backend as unsigned XDR envelopes and signed directly inside your
          Freighter wallet on your device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-left">
          <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
            <Lock className="w-5 h-5 text-brand-gold" />
            <h4 className="text-sm font-semibold text-slate-100">Zero Private Key Access</h4>
            <p className="text-xs text-slate-400">
              All transactions are authorized by you via Freighter wallet extension.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
            <Scale className="w-5 h-5 text-brand-stellar" />
            <h4 className="text-sm font-semibold text-slate-100">Deterministic Invariants</h4>
            <p className="text-xs text-slate-400">
              Continuous reconciliation ensures escrow deposits match distributions exactly.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-2">
            <FileSearch className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-100">Neutral Anomaly Audits</h4>
            <p className="text-xs text-slate-400">
              Automated discrepancy flags with factual explanations—never speculative accusations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-border-subtle text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Take control of your music rights today
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Create an artist account, analyze your first contract, and start managing transparent
            royalty agreements on Stellar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" variant="primary">
                Create free artist account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost">
                Sign in to existing account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
