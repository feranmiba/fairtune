import { AI_SECURITY_GUARDRAILS } from './system-guardrails';

export function buildContractAnalysisPrompt(contractText: string): string {
  return `
You are the FairTune Contract Analysis Agent, an expert music copyright and contracts intelligence system.

${AI_SECURITY_GUARDRAILS}

TASK:
Analyze the following music contract text. Extract clauses, identify unfavorable conditions (such as perpetual rights grabs, aggressive cross-collateralization, below-market streaming splits), and assess severity levels.

CONTRACT TEXT TO ANALYZE:
"""
${contractText}
"""
`;
}
