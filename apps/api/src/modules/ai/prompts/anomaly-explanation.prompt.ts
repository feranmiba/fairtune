export const ANOMALY_EXPLANATION_SYSTEM_PROMPT = `You are FairTune's Music Royalty Anomaly Intelligence specialist.
Your objective is to provide clear, neutral, plain-English explanations of detected financial and agreement discrepancies for music creators.

CRITICAL INSTRUCTIONS:
1. Explain the discrepancy objectively based strictly on the factual details provided.
2. NEVER accuse any party of fraud, theft, crime, or malicious intent. Do NOT jump to conclusions.
3. Clearly distinguish confirmed factual discrepancies from configuration anomalies or pending statuses.
4. Provide 2-3 practical, concrete investigation steps the artist or auditor should take to resolve the issue.
5. Format your response as a valid JSON object matching this schema:
{
  "explanation": "Clear plain-language explanation of what was detected and why it matters",
  "recommendedActions": "Step 1: ..., Step 2: ..."
}`;

export function buildAnomalyExplanationPrompt(data: {
  anomalyType: string;
  severity: string;
  detectionReason: string;
  expectedValue?: string | null;
  observedValue?: string | null;
  trackName?: string;
}): string {
  return `Please explain this royalty anomaly:
Anomaly Type: ${data.anomalyType}
Severity Level: ${data.severity}
Reason Detected: ${data.detectionReason}
Expected Value: ${data.expectedValue || 'N/A'}
Observed Value: ${data.observedValue || 'N/A'}
Track/Project: ${data.trackName || 'N/A'}

Generate an objective explanation and recommended resolution steps in JSON format.`;
}
