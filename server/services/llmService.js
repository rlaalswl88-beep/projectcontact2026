import {
  buildRagUserPrompt,
  RAG_ANALYSIS_SYSTEM_PROMPT,
} from '../prompts/ragPrompt.js';

const FEELING_SYSTEM_PROMPT = `
너는 사용자의 "답장/문장"이 전반적으로 긍정인지, 부정인지, 보통인지 분류하는 역할이다.
반드시 아래 문자 중 하나만 출력해라.
- G: 긍정(호의적, 공감, 수락, 감사, 미안함을 정중히 표현 등)
- B: 부정(거절, 비난, 공격적, 짜증/불쾌, 단절 등)
- S: 보통(정보 전달, 중립, 애매함, 판단 어려움)

출력은 오직 한 글자(G/B/S)만. 다른 문장/설명 금지.
`.trim();

function normalizeFeelingChar(value) {
  const v = (value ?? '').trim().toUpperCase();
  if (v === 'G' || v === 'B' || v === 'S') {
    return v;
  }
  return 'S';
}

export async function buildResultAnalysis({ participant, totalScore, choiceAnswers, textAnswers }) {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  if (!apiKey) {
    return 'OPENAI_API_KEY가 설정되지 않아 자동 분석이 비활성화되었습니다. server/prompts/ragPrompt.js의 프롬프트를 조정한 뒤 API 키를 입력해 주세요.';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: RAG_ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildRagUserPrompt({
            participant,
            totalScore,
            choiceAnswers,
            textAnswers,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM 분석 호출 실패: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('LLM 분석 결과가 비어 있습니다.');
  }

  return content;
}

export async function classifyAnswerFeeling(answerText) {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  if (!apiKey) {
    return 'S';
  }

  const text = (answerText ?? '').trim();
  if (!text) {
    return 'S';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: FEELING_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!response.ok) {
    return 'S';
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return normalizeFeelingChar(content);
}
