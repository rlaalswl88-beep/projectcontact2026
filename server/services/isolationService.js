const OPTION_SCORES = {
  바로: 1,
  확인: 2,
  인사: 1,
  심호흡: 1,
  끄덕: 2,
  대기: 2,
  문자: 2,
  서성: 3,
  회피: 4,
  불안: 4,
  충동: 3,
  못: 4,
  미룸: 4,
  종료: 5,
  읽지: 5,
};

function scoreByValue(value) {
  if (!value) {
    return 0;
  }

  const found = Object.entries(OPTION_SCORES).find(([keyword]) => value.includes(keyword));
  if (!found) {
    return 2;
  }
  return found[1];
}

function scoreText(text) {
  if (!text) {
    return 0;
  }
  if (text.length > 35) {
    return 1;
  }
  if (text.length > 18) {
    return 2;
  }
  return 3;
}

function toRiskLevel(total) {
  if (total <= 16) {
    return '낮음';
  }
  if (total <= 28) {
    return '중간';
  }
  return '높음';
}

function buildSummary(score) {
  if (score.riskLevel === '낮음') {
    return '사회적 접촉 회피 경향이 낮고 일상 대처가 유지되고 있습니다.';
  }
  if (score.riskLevel === '중간') {
    return '사회적 회피와 피로 신호가 함께 나타나며 주기적 모니터링이 필요합니다.';
  }
  return '고립/은둔 위험 신호가 뚜렷하여 추가 상담 및 연계 개입이 필요합니다.';
}

function analyzeResponses(responses) {
  let optionScore = 0;
  let textScore = 0;

  Object.entries(responses).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    if (key.toLowerCase().includes('summary') || key.toLowerCase().includes('mood')) {
      textScore += scoreText(value.trim());
      return;
    }

    optionScore += scoreByValue(value.trim());
  });

  const total = optionScore + textScore;
  return {
    total,
    optionScore,
    textScore,
    riskLevel: toRiskLevel(total),
  };
}

export function buildIsolationResult({ sessionId, submittedAt, totalScenes, responses }) {
  const score = analyzeResponses(responses);
  const summary = buildSummary(score);
  const ragPayload = {
    sourceScale: 'K-GILS',
    instruction: 'OpenAI 연결 전 단계: 아래 응답/점수/요약을 기반으로 상담 가이드 문서를 검색하고 피드백 생성',
    score,
    responses,
  };

  return {
    ok: true,
    sessionId,
    submittedAt,
    totalScenes,
    score,
    summary,
    ragPayload,
  };
}
