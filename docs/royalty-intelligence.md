# FairTune Advanced AI Royalty Intelligence & Forecasting

## 1. Overview

FairTune's Royalty Intelligence module helps musicians analyze, project, and simulate their earnings using actual verified ledger data.

---

## 2. Verified Earnings Analytics (`RoyaltyAnalyticsService`)

Earnings summaries are computed exclusively from database `Payment` records that have attained `CONFIRMED` status with verified on-chain transactions.

The service provides multidimensional views:

1. **Total Earnings**: Overall confirmed income to date.
2. **By Track / Project**: Revenue breakdown per registered track or song.
3. **By Collaborator**: Total amount paid out to each producer, songwriter, or collaborator.
4. **By Payment Asset**: Distribution across accepted tokens (e.g. `USDC`, `XLM`).
5. **Historical Monthly Trends**: Chronological month-by-month earnings trends.

---

## 3. Royalty Earnings Forecasting (`RoyaltyForecastingService`)

The forecasting engine estimates future revenues by modeling historical performance trends while enforcing strict separation between factual and projected figures.

### 3.1 Strict Fact vs. Projection Isolation

Every forecast output is partitioned into two distinct blocks:

- **`historicalFacts`**: Contains solely real, verified past periods (`isHistoricalFact: true`).
- **`forwardEstimates`**: Contains mathematical projections based on configurable growth rate and projection horizons (`isHistoricalFact: false`, `isModelProjection: true`).

### 3.2 Confidence Levels & Scoring

- **`LOW` (Score 0.30 - 0.50)**: Less than 3 historical periods available.
- **`MEDIUM` (Score 0.70)**: 3 to 5 historical periods analyzed.
- **`HIGH` (Score 0.85)**: 6 or more historical periods analyzed.

### 3.3 Mandatory Disclaimer

> Forward-looking earnings projections are mathematical estimates and do not guarantee future royalty revenues. Projections do not account for external streaming algorithm shifts, distributor fee revisions, or force majeure events.

---

## 4. AI Royalty Assistant & Tool Grounding

Artists can query their royalty performance through natural language conversations:

- _"How much have I earned from Midnight Groove?"_
- _"Which collaborator received the highest payout this month?"_
- _"Are there any pending distributions?"_

### Tool Restrictions

The AI agent operates under strict non-custodial guardrails:

- Permitted: `retrieve_royalty_earnings`, `retrieve_royalty_anomalies`, `calculate_royalty_distribution`.
- Strictly Prohibited: Autonomous signing, payment execution, split modification, or wallet updates.
