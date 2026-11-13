import cases from '../knowledge/system-design/index.json';

export type DesignCase = typeof cases[number];
function normalize(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function contains(question: string, phrase: string) {
  const term = normalize(phrase);
  return /[\u3400-\u9fff]/u.test(term) ? question.includes(term) : (` ${question} `).includes(` ${term} `);
}

// Only the question participates: an employer JD must not choose the architecture.
export function matchSystemDesignCases(question: string): Array<DesignCase & {score: number}> {
  const normalized = normalize(question);
  return cases.map(entry => {
    const alias = entry.aliases.some(term => contains(normalized, term));
    const concepts = entry.concepts.filter(term => contains(normalized, term)).length;
    return {...entry, score: (alias ? 4 : 0) + concepts};
  }).filter(entry => entry.score >= 3)
    .sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)).slice(0,2);
}

export const designCaseCount = cases.length;
