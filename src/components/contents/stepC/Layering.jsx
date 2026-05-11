import { AnimatePresence, motion } from 'framer-motion';
import Matter from 'matter-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Layering.css';

const tabs = [
  { id: 'info', label: '관련기사&정보', kicker: 'Related Articles', symbol: '01', image: 'CSimg001.png' },
  { id: 'chat', label: '따뜻한 한마디', kicker: 'Warm Message', symbol: '02', image: 'CSimg002.png' },
  { id: 'result', label: '설문결과', kicker: 'Survey Result', symbol: '03', image: 'CSimg003.png' },
  { id: 'stats', label: '통계', kicker: 'Statistics', symbol: '04', image: 'CSimg004.png' },
];

const fallbackStatistics = {
  totals: {
    participants: 100,
  },
  graph: {
    nodes: [
      { id: 'answer-alone', type: 'answer', label: '혼자 있는 시간', ageGroup: '20대', gender: 'M', count: 78, percentage: 34, x: -64, y: 100, z: 12, color: '#51d9ff' },
      { id: 'answer-burnout', type: 'answer', label: '번아웃', ageGroup: '30대', gender: 'F', count: 72, percentage: 29, x: 56, y: 100, z: -22, color: '#ffd166' },
      { id: 'answer-support', type: 'answer', label: '지원 요청 어려움', ageGroup: '40대+', gender: 'M', count: 57, percentage: 24, x: 16, y: 100, z: 76, color: '#b7f06f' },
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
        interactionLabel: '최근 연락을 피하고 싶은 시간이 있었나요?',
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

const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL;

const INFO_PAGE_SIZE = 10;

const INFO_CATEGORIES = [
  { type: 1, label: '관련기사' },
  { type: 2, label: '관련기관' },
  { type: 3, label: '관련 논문' },
  { type: 4, label: '관련 척도' },
];

/** link/url: 외부 http(s)는 그대로, 그 외(파일명 등)는 public/file 기준 PDF·정적 파일 */
function resolveContentItemHref(linkOrUrl) {
  if (!linkOrUrl || !String(linkOrUrl).trim()) {
    return null;
  }
  const raw = String(linkOrUrl).trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const normalized = raw.replace(/^\/+/, '').replace(/^file\/+/i, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const encodedPath = parts.map((p) => encodeURIComponent(p)).join('/');
  const base =
    PUBLIC_ASSET_BASE.endsWith('/') ? PUBLIC_ASSET_BASE.slice(0, -1) : PUBLIC_ASSET_BASE;
  const pathPrefix = `${base}/file/${encodedPath}`;
  return pathPrefix;
}

// 보조 유틸: DB의 scene 순서와 정적 이미지 리소스를 동일한 인덱스 체계로 매칭합니다.
function getResultThumbnailSrc(index) {
  const thumbnailNumber = String(index + 1).padStart(4, '0');
  const extension = resultThumbnailExtByNumber[thumbnailNumber];
  return extension ? `${PUBLIC_ASSET_BASE}img/C_result/${thumbnailNumber}.${extension}` : null;
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
              <img src={`${PUBLIC_ASSET_BASE}img/icon/back_icon.png`} alt="" />
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
  const [subType, setSubType] = useState(1);
  const [items, setItems] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const listScrollRef = useRef(null);
  const fetchLockRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore || fetchLockRef.current) {
      return;
    }
    fetchLockRef.current = true;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({
        type: String(subType),
        limit: String(INFO_PAGE_SIZE),
        offset: String(nextOffset),
      });
      const response = await fetch(`/api/content-b/items?${qs}`);
      if (!response.ok) {
        throw new Error('추가 목록을 불러오지 못했습니다.');
      }
      const data = await response.json();
      const chunk = data.items ?? [];
      setItems((prev) => [...prev, ...chunk]);
      setHasMore(Boolean(data.hasMore));
      setNextOffset((prev) => prev + chunk.length);
    } catch {
      /* 스크롤 재시도 허용 */
    } finally {
      fetchLockRef.current = false;
      setLoadingMore(false);
    }
  }, [subType, hasMore, loading, loadingMore, nextOffset]);

  useEffect(() => {
    let cancelled = false;
    fetchLockRef.current = false;

    async function loadFirst() {
      setLoading(true);
      setError('');
      setItems([]);
      setHasMore(false);
      setNextOffset(0);
      try {
        const qs = new URLSearchParams({
          type: String(subType),
          limit: String(INFO_PAGE_SIZE),
          offset: '0',
        });
        const response = await fetch(`/api/content-b/items?${qs}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || body.detail || '목록을 불러오지 못했습니다.');
        }
        const data = await response.json();
        if (cancelled) return;
        const chunk = data.items ?? [];
        setItems(chunk);
        setHasMore(Boolean(data.hasMore));
        setNextOffset(chunk.length);
        if (listScrollRef.current) {
          listScrollRef.current.scrollTop = 0;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '오류가 발생했습니다.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFirst();
    return () => {
      cancelled = true;
    };
  }, [subType]);

  function handleListScroll(e) {
    const el = e.currentTarget;
    const threshold = 96;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > threshold) {
      return;
    }
    loadMore();
  }

  return (
    <div className="layering-panel layering-panel--info">
      <span className="layering-panel__eyebrow">Related Articles</span>
      <h2>응답과 연결된 기사와 정보를 모았습니다</h2>
      <p className="layering-info-lead">
        고립, 관계, 일상 회복처럼 설문에서 드러난 신호를 더 깊게 읽을 수 있는 자료 영역입니다.
      </p>

      <div className="layering-info-tabs" role="tablist" aria-label="자료 유형">
        {INFO_CATEGORIES.map((c) => (
          <button
            key={c.type}
            type="button"
            role="tab"
            aria-selected={subType === c.type}
            className={`layering-info-tab${subType === c.type ? ' layering-info-tab--active' : ''}`}
            onClick={() => setSubType(c.type)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        ref={listScrollRef}
        className="layering-info-scroll"
        onScroll={handleListScroll}
      >
        {loading && <p className="layering-info-status">불러오는 중...</p>}

        {!loading && error && <p className="layering-info-error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="layering-info-empty">등록된 자료가 없습니다.</p>
        )}

        {!loading &&
          !error &&
          items.map((item) => {
            const href = resolveContentItemHref(item.url);
            return href ? (
              <a
                key={`${subType}-${item.id}`}
                href={href}
                className="layering-info-card layering-info-card--link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <h3 className="layering-info-card__title">{item.title}</h3>
                {item.summary ? <p className="layering-info-card__summary">{item.summary}</p> : null}
              </a>
            ) : (
              <article key={`${subType}-${item.id}`} className="layering-info-card">
                <h3 className="layering-info-card__title">{item.title}</h3>
                {item.summary ? <p className="layering-info-card__summary">{item.summary}</p> : null}
              </article>
            );
          })}

        {loadingMore && (
          <p className="layering-info-status layering-info-status--more">더 불러오는 중...</p>
        )}
      </div>
    </div>
  );
}

function parseIsolationUserCookie() {
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('isolation_user_info='));

  if (!cookie) return null;

  const rawValue = decodeURIComponent(cookie.slice('isolation_user_info='.length));
  try {
    const parsed = JSON.parse(rawValue);
    return parsed?.id ? { ...parsed, id: String(parsed.id) } : null;
  } catch {
    const params = new URLSearchParams(rawValue.replace(/,/g, '&'));
    const id = params.get('id') || rawValue.match(/id\s*[:=]\s*([^,\s]+)/)?.[1];
    return id ? { id: String(id) } : null;
  }
}

// 포트폴리오 포인트: 쿠키 userId를 기준으로 채팅 등록, 전체 조회, 내 메시지 분리 조회를 처리합니다.
function ChatPanel() {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [isMineModalOpen, setIsMineModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = parseIsolationUserCookie();
  const currentUserId = currentUser?.id ?? null;

  async function loadMessages() {
    const response = await fetch('/api/warm/messages', {
      credentials: 'include',
    });
    if (!response.ok) return;
    const data = await response.json();
    setMessages(data.messages ?? []);
  }

  async function loadMyMessages() {
    const response = await fetch('/api/warm/messages/mine', {
      credentials: 'include',
    });
    if (!response.ok) {
      setMyMessages([]);
      return;
    }
    const data = await response.json();
    setMyMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요');
      return;
    }
    if (!message.trim()) {
      alert('내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/warm/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname, message }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.message || '커뮤니티 가이드라인에 맞지 않는 표현이 포함되어 있습니다.');
        return;
      }

      setMessage('');
      window.setTimeout(() => {
        loadMessages();
        if (isMineModalOpen) loadMyMessages();
      }, 1200);
    } catch {
      alert('메시지를 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="layering-chat">
      <div className="layering-chat__tools">
        <button
          type="button"
          onClick={() => {
            setIsMineModalOpen(true);
            loadMessages();
            loadMyMessages();
          }}
        >
          내가 쓴 메시지 보기
        </button>
      </div>
      <div className="layering-chat__list">
        {messages.length === 0 && (
          <div className="layering-chat__bubble layering-chat__bubble--left">오늘 여기까지 온 것만으로도 이미 충분히 중요한 응답이에요.</div>
        )}
        {messages.map((item) => {
          const isMine = currentUserId && String(item.userId) === String(currentUserId);
          return (
            <div
              key={item.id}
              className={`layering-chat__bubble ${isMine ? 'layering-chat__bubble--right' : 'layering-chat__bubble--left'}`}
            >
              <strong>{item.nickname || '익명'}</strong>
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>
      <form className="layering-chat__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="닉네임"
          maxLength={50}
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="따뜻한 한마디를 남겨주세요"
          maxLength={500}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '등록 중' : '등록'}
        </button>
      </form>
      <AnimatePresence>
        {isMineModalOpen && (
          <motion.div
            className="layering-chat-mine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="layering-chat-mine__panel"
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              exit={{ y: 24 }}
            >
              <header>
                <strong>내가 쓴 메시지</strong>
                <button
                  type="button"
                  onClick={() => {
                    setIsMineModalOpen(false);
                    loadMessages();
                  }}
                  aria-label="닫기"
                >
                  x
                </button>
              </header>
              <div className="layering-chat-mine__list">
                {!currentUserId && <p>쿠키 정보가 없어 내 메시지를 확인할 수 없습니다.</p>}
                {currentUserId && myMessages.length === 0 && <p>아직 등록된 내 메시지가 없습니다.</p>}
                {myMessages.map((item) => (
                  <article key={item.id}>
                    <strong>{item.nickname || '익명'}</strong>
                    <span>{item.message}</span>
                  </article>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// 포트폴리오 포인트: participantId 쿠키와 백엔드 API를 연동해 개인 답변, 총점, AI 분석 리포트를 렌더링합니다.
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
  const answers = (surveyResults?.answers ?? []).filter((item) => item.sceneCode !== 'SCENE_0');

  return (
    <div className="layering-panel layering-result-panel">
      <h2>설문 리포트</h2>
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
      {participant && (
        <section className="layering-result-report layering-result-report--top">
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



      <div className="layering-result-list">
        {answers.map((item, index) => {
          const thumbnailSrc = getResultThumbnailSrc(index);
          return (
            <section key={item.sceneId} className="layering-result-question">
              {thumbnailSrc && (
                <img
                  className="layering-result-question__image"
                  src={thumbnailSrc}
                  alt=""
                  loading="lazy"
                />
              )}
              <div className="layering-result-question__content">
                
                <h3>{item.interactionLabel || item.sceneTitle}</h3>
                <div className="layering-result-answers">
                  <article className="layering-result-answer">
                    <small>내 답변</small>
                    <p>{item.answer?.answerValue || item.answer?.answerText || '응답 없음'}</p>
                  </article>
                </div>
              </div>
            </section>
          );
        })}
      </div>
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

// 포트폴리오 포인트: 전체 통계 API 데이터를 참여자 수 시각화와 질문별 상세 통계 화면으로 분기합니다.
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

  // 포트폴리오 포인트: Matter.js 물리 엔진으로 참여자 1명당 1개 입자를 생성해 누적 참여량을 직관적으로 표현합니다.
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
            const thumbnailSrc = getResultThumbnailSrc(index);
            return (
              <button
                key={question.sceneCode}
                type="button"
                className="layering-question-card"
                onClick={() => {
                  setSelectedQuestion({ ...question, thumbnailSrc });
                  setStatsStep(2);
                }}
              >
                {thumbnailSrc && (
                  <img
                    className="layering-question-card__image"
                    src={thumbnailSrc}
                    alt=""
                    loading="lazy"
                  />
                )}
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
              <span>{answer.answerType === 'option_id' ? '선택' : '감정'}</span>
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
        <canvas ref={canvasRef} className="layering-flat-canvas" aria-label="참여자 '하루' 낙하 시각화" />
      </div>
      <div className="layering-stats-next">
        <button type="button" onClick={() => setStatsStep(1)}>전체 통계 보기</button>
      </div>
    </div>
  );
}

// 포트폴리오 포인트: 모바일 중심 Step3 허브에서 4개 핵심 기능을 전면 모달 UX로 연결합니다.
function Layering() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (location.state?.openTab === 'result') {
      setActiveTab('result');
    }
  }, [location.state]);

  return (
    <main className="layering-shell">
      <div className="layering-scene" aria-hidden="true">
        <img className="layering-scene__image" src={`${PUBLIC_ASSET_BASE}img/c_sum/C_sum_main.png`} alt="" />
      </div>
      <section className="layering-phone">
        <div className="layering-menu-grid" aria-label="Step C 메뉴">
          <div className="layering-menu-spacer" aria-hidden="true" />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`layering-menu-button layering-menu-button--${tab.id}`}
              style={{ '--menu-bg-image': `url(${PUBLIC_ASSET_BASE}img/c_sum/${tab.image})` }}
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
