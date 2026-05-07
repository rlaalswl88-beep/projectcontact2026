import { AnimatePresence, motion } from 'framer-motion';
import Matter from 'matter-js';
import { useEffect, useRef, useState } from 'react';
import './Layering.css';

const tabs = [
  { id: 'info', label: '관련기사&정보', kicker: 'Related Articles', symbol: '01' },
  { id: 'chat', label: '따듯한 한마디', kicker: 'Warm Message', symbol: '02' },
  { id: 'result', label: '설문결과', kicker: 'Survey Result', symbol: '03' },
  { id: 'stats', label: '통계', kicker: 'Statistics', symbol: '04' },
];

const fallbackStatistics = {
  totals: {
    participants: 100,
  },
  graph: {
    nodes: [
      { id: 'answer-alone', type: 'answer', label: '혼자 있는 시간', ageGroup: '20대', gender: 'M', count: 78, percentage: 34, x: -64, y: 100, z: 12, color: '#51d9ff' },
      { id: 'answer-burnout', type: 'answer', label: '번아웃', ageGroup: '30대', gender: 'F', count: 72, percentage: 29, x: 56, y: 100, z: -22, color: '#ffd166' },
      { id: 'answer-support', type: 'answer', label: '도움 요청 어려움', ageGroup: '40대+', gender: 'M', count: 57, percentage: 24, x: 16, y: 100, z: 76, color: '#b7f06f' },
    ],
    links: [
      { source: 'answer-alone', target: 'answer-burnout', value: 7 },
      { source: 'answer-burnout', target: 'answer-support', value: 5 },
    ],
  },
  summary: {
    questions: [
      {
        sceneId: 1,
        sceneCode: 'SCENE_1',
        sceneTitle: '관계 피로',
        interactionLabel: '최근 연락을 피하고 싶은 순간이 있었나요?',
        interactionType: 'choice',
        totalResponses: 32,
        answers: [
          { answerType: 'option_id', answerLabel: '자주 그렇다', count: 14, percentage: 43.8 },
          { answerType: 'option_id', answerLabel: '가끔 그렇다', count: 12, percentage: 37.5 },
        ],
      },
      {
        sceneId: 2,
        sceneCode: 'SCENE_2',
        sceneTitle: '자유 응답',
        interactionLabel: '요즘 가장 부담스러운 감정은 무엇인가요?',
        interactionType: 'input',
        totalResponses: 18,
        answers: [
          { answerType: 'answer_text', answerLabel: '무기력함', count: 5, percentage: 27.8 },
          { answerType: 'answer_text', answerLabel: '불안함', count: 4, percentage: 22.2 },
        ],
      },
    ],
  },
};

const resultThumbnailExtByNumber = {
  '0001': 'png',
  '0002': 'png',
  '0003': 'png',
  '0004': 'JPG',
  '0005': 'JPG',
  '0006': 'png',
  '0007': 'png',
  '0008': 'png',
  '0009': 'png',
  '0010': 'JPG',
  '0011': 'png',
  '0012': 'png',
  '0013': 'png',
};

function getResultThumbnailSrc(question, index) {
  const thumbnailNumber = String(index + 1).padStart(4, '0');
  const extension = resultThumbnailExtByNumber[thumbnailNumber];
  return extension ? `/img/C_result/${thumbnailNumber}.${extension}` : null;
}

const chartColors = ['#5ee7ff', '#8bffbd', '#ffd166', '#ff8fab', '#b69cff', '#ffffff'];

function getPieChartBackground(answers) {
  if (!answers?.length) {
    return 'conic-gradient(rgba(255, 255, 255, 0.22) 0deg 360deg)';
  }

  let currentDegree = 0;
  const segments = answers.map((answer, index) => {
    const slice = Math.max(0, Number(answer.percentage ?? 0)) * 3.6;
    const start = currentDegree;
    const end = currentDegree + slice;
    currentDegree = end;
    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function MobileModal({ activeTab, onClose }) {
  const tab = tabs.find((item) => item.id === activeTab);

  return (
    <AnimatePresence>
      {activeTab && (
        <motion.section
          className="layering-modal"
          initial={{ y: '100%', opacity: 0.86 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.86 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          aria-modal="true"
          role="dialog"
        >
          <header className="layering-modal__header">
            <button className="layering-modal__close" type="button" onClick={onClose} aria-label="닫기">
              x
            </button>
            <strong>{tab?.label}</strong>
          </header>
          <div className="layering-modal__body">
            {activeTab === 'info' && <InfoPanel />}
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'result' && <PersonalResultPanel />}
            {activeTab === 'stats' && <StatsPanel />}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function InfoPanel() {
  return (
    <div className="layering-panel">
      <span className="layering-panel__eyebrow">Related Articles</span>
      <h2>응답과 연결된 기사와 정보를 모았습니다.</h2>
      <p>고립, 관계 단절, 도움 요청의 어려움처럼 설문에서 드러난 신호를 더 깊게 읽을 수 있는 자료 영역입니다.</p>
      <div className="layering-info-grid">
        <div><strong>관련 키워드</strong><span>고립, 은둔, 관계 피로</span></div>
        <div><strong>연령 분기</strong><span>YB / OB</span></div>
        <div><strong>데이터 기준</strong><span>설문 응답 관계</span></div>
      </div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="layering-chat">
      <div className="layering-chat__bubble layering-chat__bubble--left">오늘 여기까지 온 것만으로도 이미 충분히 중요한 응답이에요.</div>
      <div className="layering-chat__bubble layering-chat__bubble--right">내 상태를 보는 일이 조금 낯설긴 해요.</div>
      <div className="layering-chat__bubble layering-chat__bubble--left">낯설어도 괜찮아요. 지금은 판단보다 확인이 먼저입니다.</div>
    </div>
  );
}

function PersonalResultPanel() {
  const [surveyResults, setSurveyResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadSurveyResults() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch('/api/isolation/survey-results', {
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || '설문결과 데이터를 불러오지 못했습니다.');
        }
        if (!ignore) setSurveyResults(data);
      } catch (error) {
        if (!ignore) setErrorMessage(error.message || '설문결과 데이터를 불러오지 못했습니다.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadSurveyResults();
    return () => {
      ignore = true;
    };
  }, []);

  const participant = surveyResults?.participant ?? null;
  const answers = surveyResults?.answers ?? [];

  return (
    <div className="layering-panel layering-result-panel">
      <span className="layering-panel__eyebrow">Survey Result</span>
      <h2>내 설문 리포트</h2>
      {isLoading && <p className="layering-result-state">내 설문결과를 불러오는 중입니다.</p>}
      {errorMessage && <p className="layering-result-state layering-result-state--error">{errorMessage}</p>}
      {!isLoading && !errorMessage && answers.length === 0 && (
        <p className="layering-result-state">아직 저장된 내 설문 답변이 없습니다.</p>
      )}

      {participant && (
        <div className="layering-result-profile">
          <strong>{participant.name || '익명'}님의 답변</strong>
          <span>
            {participant.age ? `${participant.age}세` : '나이 미입력'}
            {participant.gender ? ` / ${participant.gender}` : ''}
          </span>
        </div>
      )}

      <div className="layering-result-list">
        {answers.map((item, index) => (
          <section key={item.sceneId} className="layering-result-question">
            <div className="layering-result-question__head">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <em>{item.interactionType}</em>
            </div>
            <h3>{item.interactionLabel || item.sceneTitle}</h3>
            <div className="layering-result-answers">
              <article className="layering-result-answer">
                <small>내 답변</small>
                <p>{item.answer?.answerValue || item.answer?.answerText || '응답 없음'}</p>
              </article>
            </div>
          </section>
        ))}
      </div>

      {participant && (
        <section className="layering-result-report">
          <div>
            <span>총점</span>
            <strong>{participant.totalScore ?? 0}</strong>
          </div>
          <article>
            <span>AI 설문 리포트</span>
            <p>{participant.resultAnalysis || '아직 생성된 AI 설문 리포트가 없습니다.'}</p>
          </article>
        </section>
      )}
    </div>
  );
}

function ResultPanel() {
  const [surveyResults, setSurveyResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadSurveyResults() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch('/api/isolation/survey-results');
        if (!response.ok) throw new Error('survey result request failed');
        const data = await response.json();
        if (!ignore) setSurveyResults(data);
      } catch {
        if (!ignore) setErrorMessage('설문결과 데이터를 불러오지 못했습니다.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadSurveyResults();
    return () => {
      ignore = true;
    };
  }, []);

  const scenes = surveyResults?.scenes ?? [];

  return (
    <div className="layering-panel layering-result-panel">
      <span className="layering-panel__eyebrow">Survey Result</span>
      <h2>질문과 답변</h2>
      {isLoading && <p className="layering-result-state">설문결과를 불러오는 중입니다.</p>}
      {errorMessage && <p className="layering-result-state layering-result-state--error">{errorMessage}</p>}
      {!isLoading && !errorMessage && scenes.length === 0 && (
        <p className="layering-result-state">아직 저장된 설문 답변이 없습니다.</p>
      )}
      <div className="layering-result-list">
        {scenes.map((scene) => (
          <section key={scene.sceneId} className="layering-result-question">
            <div className="layering-result-question__head">
              <span>{scene.sceneCode}</span>
              <em>{scene.interactionType}</em>
            </div>
            <h3>{scene.interactionLabel || scene.sceneTitle}</h3>
            <div className="layering-result-answers">
              {scene.responses.length > 0 ? (
                scene.responses.map((response) => (
                  <article key={response.responseId} className="layering-result-answer">
                    <small>
                      참여자 #{response.participantId}
                      {response.participant?.totalScore !== undefined && response.participant?.totalScore !== null
                        ? ` / 총점 ${response.participant.totalScore}`
                        : ''}
                    </small>
                    <p>{response.answerValue || response.answerText || '응답 없음'}</p>
                    {response.participant?.resultAnalysis && (
                      <blockquote>{response.participant.resultAnalysis}</blockquote>
                    )}
                  </article>
                ))
              ) : (
                <article className="layering-result-answer">
                  <p>아직 응답이 없습니다.</p>
                </article>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatsPanel() {
  const canvasRef = useRef(null);
  const [statsStep, setStatsStep] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadStatistics() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch('/api/isolation/statistics');
        if (!response.ok) throw new Error('statistics request failed');
        const data = await response.json();
        if (!ignore) setStatistics(data);
      } catch {
        if (!ignore) {
          setStatistics(fallbackStatistics);
          setErrorMessage('DB 통계를 불러오지 못해 임시 데이터로 표시 중입니다.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadStatistics();
    return () => {
      ignore = true;
    };
  }, []);

  const participantTotal = statistics?.totals?.participants ?? 0;
  const visualParticipantTotal = participantTotal;
  const questions = (statistics?.summary?.questions?.length
    ? statistics.summary.questions
    : fallbackStatistics.summary.questions
  ).filter((question) => question.sceneCode !== 'SCENE_0');

  useEffect(() => {
    if (statsStep !== 0 || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const radius = 28;
    const headerSafeY = 72;
    const spawnY = -radius * 2;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 },
    });
    const world = engine.world;
    const bodies = [];
    const walls = [
      Matter.Bodies.rectangle(width / 2, height + 28, width, 56, { isStatic: true }),
      Matter.Bodies.rectangle(-28, height / 2, 56, height, { isStatic: true }),
      Matter.Bodies.rectangle(width + 28, height / 2, 56, height, { isStatic: true }),
    ];

    Matter.World.add(world, walls);

    const timers = Array.from({ length: visualParticipantTotal }, (_, index) => {
      const delay = index * 48;
      return window.setTimeout(() => {
        const seed = Math.sin(index * 12.9898) * 43758.5453;
        const x = radius * 1.8 + (seed - Math.floor(seed)) * (width - radius * 3.6);
        const body = Matter.Bodies.circle(x, spawnY, radius, {
          restitution: 0.24,
          friction: 0.08,
          frictionAir: 0.002,
          density: 0.001,
          slop: 0.02,
        });
        Matter.Body.setVelocity(body, {
          x: (((index * 17) % 11) - 5) * 0.45,
          y: 5.5 + (index % 4) * 0.55,
        });
        bodies.push(body);
        Matter.World.add(world, body);
      }, delay);
    });

    let frameId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedStep = 1000 / 60;

    const draw = (time) => {
      const delta = Math.min(50, time - lastTime);
      lastTime = time;
      accumulator += delta;
      while (accumulator >= fixedStep) {
        Matter.Engine.update(engine, fixedStep);
        accumulator -= fixedStep;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      context.shadowColor = 'rgba(210, 248, 255, 0.72)';
      context.shadowBlur = 12;

      bodies.forEach((body) => {
        const { x, y } = body.position;
        if (y <= headerSafeY) return;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frameId);
      timers.forEach((timer) => window.clearTimeout(timer));
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [statsStep, visualParticipantTotal]);

  if (statsStep === 1) {
    return (
      <div className="layering-stats-summary">
        <header className="layering-stats-toolbar">
          <button type="button" onClick={() => setStatsStep(0)}>돌아가기</button>
          <strong>질문별 통계</strong>
        </header>
        <div className="layering-question-grid">
          {questions.map((question, index) => {
            const thumbnailSrc = getResultThumbnailSrc(question, index);
            return (
              <button
                key={question.sceneCode}
                type="button"
                className="layering-question-card"
                style={thumbnailSrc ? { backgroundImage: `url(${thumbnailSrc})` } : undefined}
                onClick={() => {
                  setSelectedQuestion({ ...question, thumbnailSrc });
                  setStatsStep(2);
                }}
              >
                <span className="layering-question-thumb">{String(index + 1).padStart(2, '0')}</span>
                <span className="layering-question-tap" aria-hidden="true">통계 보기</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (statsStep === 2 && selectedQuestion) {
    const pieBackground = getPieChartBackground(selectedQuestion.answers);

    return (
      <div
        className="layering-question-detail"
        style={selectedQuestion.thumbnailSrc ? { '--detail-bg-image': `url(${selectedQuestion.thumbnailSrc})` } : undefined}
      >
        <div className="layering-detail-hero">
          <button type="button" onClick={() => setStatsStep(1)}>목록</button>
          <div>
            <small>{selectedQuestion.sceneCode} / {selectedQuestion.interactionType}</small>
            <h2>{selectedQuestion.interactionLabel || selectedQuestion.sceneTitle}</h2>
          </div>
        </div>
        <div className="layering-answer-list">
          <div className="layering-pie-chart" style={{ background: pieBackground }}>
            <span>{selectedQuestion.totalResponses ?? 0}명</span>
          </div>
          {selectedQuestion.answers.map((answer, index) => (
            <div
              key={`${answer.answerKey ?? answer.answerLabel}-${index}`}
              className="layering-answer-row"
              style={{ '--legend-color': chartColors[index % chartColors.length] }}
            >
              <span>{answer.answerType === 'option_id' ? '선택형' : '주관식'}</span>
              <strong>{answer.answerLabel}</strong>
              <em>{answer.count}명 / {answer.percentage}%</em>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="layering-stats">
      <div className="layering-flat-viz">
        {isLoading && <div className="layering-stats-status">통계 집계 중</div>}
        <div className="layering-flat-viz__copy">
          <strong>
            {isLoading
              ? '통계를 불러오는 중입니다.'
              : `지금까지 ${participantTotal.toLocaleString()}개의 '하루'가 제출되었습니다.`}
          </strong>
        </div>
        <canvas ref={canvasRef} className="layering-flat-canvas" aria-label="참여자 수 낙하 시각화" />
      </div>
      <div className="layering-stats-next">
        <button type="button" onClick={() => setStatsStep(1)}>전체 통계 보기</button>
      </div>
    </div>
  );
}

function Layering() {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <main className="layering-shell">
      <section className="layering-phone">
        <div className="layering-menu-grid" aria-label="Step C 메뉴">
          <div className="layering-menu-spacer" aria-hidden="true" />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`layering-menu-button layering-menu-button--${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="layering-menu-button__num">{tab.symbol}</span>
              <span className="layering-menu-button__text">
                <small>{tab.kicker}</small>
                <strong>{tab.label}</strong>
              </span>
            </button>
          ))}
        </div>

        <MobileModal activeTab={activeTab} onClose={() => setActiveTab(null)} />
      </section>
    </main>
  );
}

export default Layering;
