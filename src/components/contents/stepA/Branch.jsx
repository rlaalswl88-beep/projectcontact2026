import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './branch.css';

const TOTAL_MS = 3000;
const INTERACTION_POINT = 0.72;

function videoUrlForScene(scene) {
  if (!scene || scene.video === false) {
    return null;
  }
  const name = scene.video ?? `${scene.sceneCode}.mp4`;
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}video/${encodeURIComponent(name)}`;
}

function getProgress(ms) {
  return Math.min(100, Math.round((ms / TOTAL_MS) * 100));
}

const STEP_PROFILE_COOKIE = 'isolation_user_info';

function setStepProfileCookie(profile) {
  const encoded = encodeURIComponent(JSON.stringify(profile));
  document.cookie = `${STEP_PROFILE_COOKIE}=${encoded}; path=/; max-age=${60 * 60 * 24}`;
}

export default function Branch() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const pausedForChoiceRef = useRef(false);

  const [scenes, setScenes] = useState([]);
  const [loadingScenes, setLoadingScenes] = useState(true);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState('');
  const [introName, setIntroName] = useState('');
  const [introAge, setIntroAge] = useState('');
  const [introGender, setIntroGender] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const scene = scenes[sceneIndex];
  const sceneCodeToIndex = useMemo(
    () =>
      scenes.reduce((acc, item, idx) => {
        acc[item.sceneCode] = idx;
        return acc;
      }, {}),
    [scenes],
  );
  const videoSrc = useMemo(() => videoUrlForScene(scene), [scene]);
  const effectiveVideoSrc = videoLoadFailed ? null : videoSrc;

  const progress = effectiveVideoSrc ? Math.min(100, Math.round(videoProgress)) : getProgress(elapsedMs);
  const isLastScene = sceneIndex === scenes.length - 1;
  const canAutoNext = scene?.interaction?.type === 'none';

  useEffect(() => {
    const loadScenes = async () => {
      setLoadingScenes(true);
      setErrorMessage('');
      try {
        const response = await fetch('/api/scenes');
        if (!response.ok) {
          throw new Error('씬 목록 응답 오류');
        }
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.scenes) || data.scenes.length === 0) {
          throw new Error('씬 목록 데이터 없음');
        }
        setScenes(data.scenes);
      } catch (error) {
        setErrorMessage('씬 데이터를 불러오지 못했습니다. 서버/DB를 확인해 주세요.');
      } finally {
        setLoadingScenes(false);
      }
    };

    loadScenes();
  }, []);

  useEffect(() => {
    if (!scene) {
      return;
    }
    setElapsedMs(0);
    setVideoProgress(0);
    setVideoLoadFailed(false);
    pausedForChoiceRef.current = false;
    setDraft(scene.interaction?.key ? answers[scene.interaction.key] || '' : '');
    setIntroName(answers.introName || '');
    setIntroAge(answers.introAge || '');
    setIntroGender(answers.introGender || '');
    setShowPanel(false);
    setErrorMessage('');
  }, [sceneIndex, answers, scene]);

  useEffect(() => {
    if (!scene) {
      return undefined;
    }
    if (effectiveVideoSrc) {
      return undefined;
    }
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
  }, [scene, showPanel, effectiveVideoSrc]);

  useEffect(() => {
    if (!scene) {
      return undefined;
    }
    if (effectiveVideoSrc) {
      return undefined;
    }
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
  }, [elapsedMs, canAutoNext, showPanel, effectiveVideoSrc, scene, scenes.length]);

  useEffect(() => {
    if (!scene) {
      return undefined;
    }
    if (!effectiveVideoSrc) {
      return undefined;
    }
    const v = videoRef.current;
    if (!v) {
      return undefined;
    }

    const sync = () => {
      const d = v.duration;
      if (!d || !Number.isFinite(d)) {
        return;
      }
      const pct = Math.min(100, (v.currentTime / d) * 100);
      setVideoProgress(pct);

      if (pct >= INTERACTION_POINT * 100) {
        setShowPanel(true);
      }

      if (
        scene.interaction.type !== 'none' &&
        v.currentTime >= d * INTERACTION_POINT &&
        !pausedForChoiceRef.current
      ) {
        pausedForChoiceRef.current = true;
        v.pause();
      }
    };

    const onEnded = () => {
      setVideoProgress(100);
      setShowPanel(true);
      if (scene.interaction.type === 'none') {
        window.setTimeout(() => {
          setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
        }, 500);
      }
    };

    v.addEventListener('timeupdate', sync);
    v.addEventListener('ended', onEnded);
    v.play().catch(() => {});

    return () => {
      v.removeEventListener('timeupdate', sync);
      v.removeEventListener('ended', onEnded);
    };
  }, [scene, sceneIndex, effectiveVideoSrc, scenes.length]);

  const handleVideoError = () => {
    setVideoLoadFailed(true);
    setShowPanel(true);

    if (scene?.interaction?.type === 'none') {
      window.setTimeout(() => {
        setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
      }, 500);
    }
  };

  const responseCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[key]).length,
    [answers],
  );

  const moveNextScene = (nextSceneCode) => {
    if (nextSceneCode && sceneCodeToIndex[nextSceneCode] !== undefined) {
      setSceneIndex(sceneCodeToIndex[nextSceneCode]);
      return;
    }
    if (!isLastScene) {
      setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
    }
  };

  const saveChoice = (option) => {
    const answerValue = option?.text ?? '';
    setAnswers((prev) => ({ ...prev, [scene.interaction.key]: answerValue }));
    moveNextScene(option?.nextSceneCode);
  };

  const saveInputAndMove = () => {
    if (scene.sceneCode === 'SCENE_0') {
      if (!introName.trim() || !introAge.trim() || !introGender) {
        const message = '이름, 나이, 성별을 모두 입력해 주세요.';
        setErrorMessage(message);
        window.alert(message);
        return;
      }
      setAnswers((prev) => ({
        ...prev,
        introName: introName.trim(),
        introAge: introAge.trim(),
        introGender,
        [scene.interaction.key]: `${introName.trim()} / ${introAge.trim()}세 / ${introGender}`,
      }));
      moveNextScene();
      return;
    }

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
      const numericAge = Number.parseInt(introAge, 10) || 0;
      setStepProfileCookie({
        id: data.participantId ?? null,
        name: introName.trim(),
        generation: numericAge <= 40 ? 'YB' : 'OB',
        gender: introGender,
      });
      navigate('/isolation/step2');
    } catch (error) {
      setErrorMessage('분석 전송 중 문제가 발생했습니다. 서버를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingScenes) {
    return <div className="stepa-player">씬 데이터를 불러오는 중...</div>;
  }

  if (!scene) {
    return (
      <div className="stepa-player">
        <p className="stepa-player__error">{errorMessage || '씬 데이터가 없습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="stepa-player">
      <header className="stepa-player__header">
        <strong>StepA Demo Interactive</strong>
        <span>
          Scene {scene.id} / {scenes.length}
        </span>
      </header>

      <div className="stepa-player__video">
        {effectiveVideoSrc ? (
          <video
            key={sceneIndex}
            ref={videoRef}
            className="stepa-player__video-el"
            src={effectiveVideoSrc}
            playsInline
            muted
            preload="auto"
            onError={handleVideoError}
          />
        ) : null}
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
                    key={option.id}
                    type="button"
                    className="stepa-player__choice-btn"
                    onClick={() => saveChoice(option)}
                  >
                    {option.text}
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
              {scene.sceneCode === 'SCENE_0' ? (
                <div className="stepa-player__intro-row">
                  <input
                    id="intro-name"
                    type="text"
                    className="stepa-player__choice-btn"
                    value={introName}
                    placeholder="이름 입력"
                    onChange={(e) => setIntroName(e.target.value)}
                  />
                  <input
                    id="intro-age"
                    type="number"
                    className="stepa-player__choice-btn"
                    value={introAge}
                    placeholder="나이 입력"
                    onChange={(e) => setIntroAge(e.target.value)}
                  />
                  <select
                    id="intro-gender"
                    className="stepa-player__choice-btn stepa-player__intro-select"
                    value={introGender}
                    onChange={(e) => setIntroGender(e.target.value)}
                  >
                    <option value="">성별 선택</option>
                    <option value="M">남자</option>
                    <option value="F">여자</option>
                  </select>
                </div>
              ) : (
                <textarea
                  id={scene.interaction.key}
                  className="stepa-player__textarea"
                  value={draft}
                  placeholder={scene.interaction.placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
              <button type="button" className="btn-save stepa-player__submit-btn" onClick={saveInputAndMove}>
                다음
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
