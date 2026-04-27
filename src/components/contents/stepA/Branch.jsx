import { useEffect, useMemo, useState } from 'react';
import './branch.css';

const TOTAL_MS = 6500;
const INTERACTION_POINT = 0.72;

const scenes = [
  { id: 1, title: '프롤로그', narration: '최근 하루가 반복된다.', interaction: { type: 'none' } },
  {
    id: 2,
    title: '인스타그램',
    narration: '타인의 소식만 본다. 오늘 감정을 적어보자.',
    interaction: { type: 'input', key: 'scene2Mood', label: '지금 감정 한 줄', placeholder: '예) 무기력하고 답답함' },
  },
  {
    id: 3,
    title: '메시지',
    narration: '친구 메시지가 도착했다. 답장을 선택해보자.',
    interaction: {
      type: 'choice',
      key: 'scene3Reply',
      label: '메시지 반응',
      options: ['바로 답장', '확인만 함', '읽지 않음'],
    },
  },
  {
    id: 4,
    title: '약속 제안',
    narration: '오랜만에 친구가 약속을 제안했다.',
    interaction: {
      type: 'choice',
      key: 'scene4Plan',
      label: '약속 제안에 대한 반응',
      options: ['일정 확인 후 답장', '다음에 보자고 미룸', '대화 종료'],
    },
  },
  { id: 5, title: '지하철 풍경', narration: '창밖 풍경을 오래 바라본다.', interaction: { type: 'none' } },
  {
    id: 6,
    title: '안내 방송',
    narration: '이어폰 너머 안내 방송이 들린다.',
    interaction: {
      type: 'choice',
      key: 'scene6Notice',
      label: '안내 방송 후 행동',
      options: ['주변을 살핀다', '아무 반응 없음', '불안해진다'],
    },
  },
  {
    id: 7,
    title: '문이 열린다',
    narration: '승객이 몰리는 출구 앞.',
    interaction: {
      type: 'choice',
      key: 'scene7Crowd',
      label: '출구에서의 선택',
      options: ['사람 사이를 지나간다', '잠시 대기한다', '다른 칸으로 이동'],
    },
  },
  { id: 8, title: '역사 내부', narration: '와이드한 역사 공간이 보인다.', interaction: { type: 'none' } },
  { id: 9, title: '퇴근길', narration: '주변 소음이 크게 느껴진다.', interaction: { type: 'none' } },
  {
    id: 10,
    title: '식당 앞',
    narration: '혼밥을 고민하는 순간.',
    interaction: {
      type: 'choice',
      key: 'scene10Meal',
      label: '식당 앞 선택',
      options: ['들어가서 식사', '주변 배회', '그냥 지나침'],
    },
  },
  { id: 11, title: '편의점 앞', narration: '밝은 조명 아래 잠시 멈춘다.', interaction: { type: 'none' } },
  {
    id: 12,
    title: '편의점',
    narration: '물건을 고르는 짧은 시간.',
    interaction: {
      type: 'choice',
      key: 'scene12Buy',
      label: '구매 행동',
      options: ['필요한 것만 구매', '충동 구매', '아무것도 못 고름'],
    },
  },
  {
    id: 13,
    title: '계산대',
    narration: '직원과 눈이 마주친다.',
    interaction: {
      type: 'choice',
      key: 'scene13Pay',
      label: '계산대 반응',
      options: ['인사한다', '고개만 끄덕임', '시선 회피'],
    },
  },
  { id: 14, title: '귀가', narration: '열쇠 소리와 함께 침묵이 이어진다.', interaction: { type: 'none' } },
  {
    id: 15,
    title: '부재중 전화',
    narration: '엄마의 부재중 전화가 남아있다.',
    interaction: {
      type: 'choice',
      key: 'scene15Call',
      label: '전화에 대한 반응',
      options: ['바로 전화', '문자 남김', '다음에 연락'],
    },
  },
  {
    id: 16,
    title: '집 앞',
    narration: '엘리베이터 앞에서 잠시 멈춘다.',
    interaction: {
      type: 'choice',
      key: 'scene16Home',
      label: '집에 들어가기 전',
      options: ['바로 들어간다', '잠깐 더 서성인다', '근처 산책'],
    },
  },
  {
    id: 17,
    title: '현관',
    narration: '택배 상자가 놓여 있다.',
    interaction: {
      type: 'choice',
      key: 'scene17Box',
      label: '택배 처리',
      options: ['즉시 개봉', '구석에 둔다', '내일 보기로 함'],
    },
  },
  {
    id: 18,
    title: '손잡이',
    narration: '문 손잡이를 오래 잡고 있다.',
    interaction: {
      type: 'choice',
      key: 'scene18Door',
      label: '문 앞 행동',
      options: ['잠깐 심호흡', '바로 들어감', '멈춰 선다'],
    },
  },
  {
    id: 19,
    title: '엔딩',
    narration: '오늘 하루를 한 문장으로 남겨보자.',
    interaction: { type: 'input', key: 'scene19Summary', label: '하루 요약', placeholder: '예) 오늘도 사람들 사이에서 혼자였다' },
  },
];

function getProgress(ms) {
  return Math.min(100, Math.round((ms / TOTAL_MS) * 100));
}

export default function Branch() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const scene = scenes[sceneIndex];
  const progress = getProgress(elapsedMs);
  const isLastScene = sceneIndex === scenes.length - 1;
  const canAutoNext = scene.interaction.type === 'none';

  useEffect(() => {
    setElapsedMs(0);
    setDraft(answers[scene.interaction.key] || '');
    setShowPanel(false);
    setErrorMessage('');
  }, [sceneIndex, answers, scene.interaction.key]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedMs((prev) => {
        const next = Math.min(TOTAL_MS, prev + 100);
        if (!showPanel && next >= TOTAL_MS * INTERACTION_POINT) {
          setShowPanel(true);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [sceneIndex, showPanel]);

  useEffect(() => {
    if (!canAutoNext || !showPanel) {
      return undefined;
    }

    if (elapsedMs >= TOTAL_MS) {
      const moveTimer = window.setTimeout(() => {
        setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
      }, 500);
      return () => window.clearTimeout(moveTimer);
    }

    return undefined;
  }, [elapsedMs, canAutoNext, showPanel]);

  const responseCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[key]).length,
    [answers],
  );

  const moveNextScene = () => {
    if (!isLastScene) {
      setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
    }
  };

  const saveChoice = (value) => {
    setAnswers((prev) => ({ ...prev, [scene.interaction.key]: value }));
    moveNextScene();
  };

  const saveInputAndMove = () => {
    if (!draft.trim()) {
      setErrorMessage('문장을 입력해 주세요.');
      return;
    }
    setAnswers((prev) => ({ ...prev, [scene.interaction.key]: draft.trim() }));
    moveNextScene();
  };

  const resetAll = () => {
    setSceneIndex(0);
    setElapsedMs(0);
    setAnswers({});
    setDraft('');
    setShowPanel(false);
    setResult(null);
    setErrorMessage('');
  };

  const submitAll = async () => {
    setSubmitting(true);
    setErrorMessage('');
    setResult(null);

    try {
      const payload = {
        sessionId: `stepA-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        totalScenes: scenes.length,
        responses: answers,
      };

      const response = await fetch('/api/isolation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setErrorMessage('분석 전송 중 문제가 발생했습니다. 서버를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stepa-player">
      <header className="stepa-player__header">
        <strong>StepA Demo Interactive</strong>
        <span>
          Scene {scene.id} / {scenes.length}
        </span>
      </header>

      <div className="stepa-player__video">
        <div className="stepa-player__video-overlay">
          <p className="stepa-player__scene-title">{scene.title}</p>
          <p className="stepa-player__scene-copy">{scene.narration}</p>
          <div className="stepa-player__progress-track">
            <div className="stepa-player__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {showPanel && (
        <section className="stepa-player__panel">
          {scene.interaction.type === 'none' && <p>다음 장면으로 이동 중...</p>}

          {scene.interaction.type === 'choice' && (
            <>
              <p className="stepa-player__question">{scene.interaction.label}</p>
              <div className="stepa-player__choices">
                {scene.interaction.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="stepa-player__choice-btn"
                    onClick={() => saveChoice(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {scene.interaction.type === 'input' && (
            <>
              <label className="stepa-player__question" htmlFor={scene.interaction.key}>
                {scene.interaction.label}
              </label>
              <textarea
                id={scene.interaction.key}
                className="stepa-player__textarea"
                value={draft}
                placeholder={scene.interaction.placeholder}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="button" className="btn-save stepa-player__submit-btn" onClick={saveInputAndMove}>
                저장 후 다음
              </button>
            </>
          )}
        </section>
      )}

      <footer className="stepa-player__footer">
        <span>응답 저장: {responseCount}개</span>
        <div className="stepa-player__actions">
          <button type="button" className="btn-clear stepa-player__action-btn" onClick={resetAll}>
            초기화
          </button>
          {isLastScene && (
            <button
              type="button"
              className="btn-save stepa-player__action-btn stepa-player__action-btn--primary"
              disabled={submitting}
              onClick={submitAll}
            >
              {submitting ? '분석 중...' : '결과 저장/분석'}
            </button>
          )}
        </div>
      </footer>

      {errorMessage && <p className="stepa-player__error">{errorMessage}</p>}

      {result && (
        <section className="stepa-player__result">
          <h3>분석 결과 (데모)</h3>
          <p>총점: {result.score.total}</p>
          <p>위험 단계: {result.score.riskLevel}</p>
          <p>요약: {result.summary}</p>
        </section>
      )}
    </div>
  );
}
