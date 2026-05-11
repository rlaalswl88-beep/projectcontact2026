import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Branch.css';

const TOTAL_MS = 3000;
const INTERACTION_POINT = 0.72;
const INTRO_SCENE_CODE = 'SCENE_0';
const OPTIONAL_INPUT_SCENE_CODE = 'SCENE_3';
const INTRO_BRIDGE_VIDEO = 'SCENE_0-2.mp4';

function videoUrlForName(name) {
  if (!name) {
    return null;
  }
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}video/${encodeURIComponent(name)}`;
}

function videoUrlForScene(scene) {
  if (!scene || scene.video === false) {
    return null;
  }
  const name = scene.video ?? `${scene.sceneCode}.mp4`;
  return videoUrlForName(name);
}

function getProgress(ms) {
  return Math.min(100, Math.round((ms / TOTAL_MS) * 100));
}

const STEP_PROFILE_COOKIE = 'isolation_user_info';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!path.startsWith('/')) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}

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
  const [playingIntroBridge, setPlayingIntroBridge] = useState(false);
  const [existingParticipant, setExistingParticipant] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [introResolvedParticipantId, setIntroResolvedParticipantId] = useState(null);

  const scene = scenes[sceneIndex];
  const sceneCodeToIndex = useMemo(
    () =>
      scenes.reduce((acc, item, idx) => {
        acc[item.sceneCode] = idx;
        return acc;
      }, {}),
    [scenes],
  );
  const isIntroScene = scene?.sceneCode === INTRO_SCENE_CODE;
  const videoSrc = useMemo(() => {
    if (playingIntroBridge) {
      return videoUrlForName(INTRO_BRIDGE_VIDEO);
    }
    return videoUrlForScene(scene);
  }, [scene, playingIntroBridge]);
  const effectiveVideoSrc = videoLoadFailed ? null : videoSrc;

  const progress = effectiveVideoSrc ? Math.min(100, Math.round(videoProgress)) : getProgress(elapsedMs);
  const isLastScene = sceneIndex === scenes.length - 1;
  const canAutoNext = scene?.interaction?.type === 'none';
  const panelOpenProgress = (isIntroScene || playingIntroBridge) ? 100 : INTERACTION_POINT * 100;

  useEffect(() => {
    const loadScenes = async () => {
      setLoadingScenes(true);
      setErrorMessage('');
      try {
        const response = await fetch(apiUrl('/api/scenes'));
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
  }, [sceneIndex, answers, scene, playingIntroBridge]);

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

      if (pct >= panelOpenProgress) {
        setShowPanel(true);
      }

      if (
        scene.interaction.type !== 'none' &&
        v.currentTime >= d * INTERACTION_POINT &&
        !pausedForChoiceRef.current &&
        !isIntroScene &&
        !playingIntroBridge
      ) {
        pausedForChoiceRef.current = true;
        v.pause();
      }
    };

    const onEnded = () => {
      if (playingIntroBridge) {
        setPlayingIntroBridge(false);
        moveNextScene('SCENE_1');
        return;
      }
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
  }, [scene, sceneIndex, effectiveVideoSrc, scenes.length, panelOpenProgress, isIntroScene, playingIntroBridge]);

  const handleVideoError = () => {
    setVideoLoadFailed(true);
    setShowPanel(true);

    if (scene?.interaction?.type === 'none') {
      window.setTimeout(() => {
        setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
      }, 500);
    }
  };

  function moveNextScene(nextSceneCode) {
    if (nextSceneCode && sceneCodeToIndex[nextSceneCode] !== undefined) {
      setSceneIndex(sceneCodeToIndex[nextSceneCode]);
      return;
    }
    if (!isLastScene) {
      setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
    }
  }

  const saveChoice = (option) => {
    const answerValue = option?.text ?? '';
    setAnswers((prev) => ({ ...prev, [scene.interaction.key]: answerValue }));
    moveNextScene(option?.nextSceneCode);
  };

  const proceedIntroScene = (participantId = null) => {
    const trimmedName = introName.trim();
    const trimmedAge = introAge.trim();
    setIntroResolvedParticipantId(participantId);
    setExistingParticipant(null);
    setAnswers((prev) => ({
      ...prev,
      introName: trimmedName,
      introAge: trimmedAge,
      introGender,
      [scene.interaction.key]: `${trimmedName} / ${trimmedAge}세 / ${introGender}`,
    }));
    if (sceneCodeToIndex.SCENE_1 !== undefined) {
      setShowPanel(false);
      setPlayingIntroBridge(true);
      return;
    }
    moveNextScene();
  };

  const saveInputAndMove = () => {
    if (scene.sceneCode === INTRO_SCENE_CODE) {
      if (!introName.trim() || !introAge.trim() || !introGender) {
        const message = '이름, 나이, 성별을 모두 입력해 주세요.';
        setErrorMessage(message);
        window.alert(message);
        return;
      }
      setCheckingExisting(true);
      setErrorMessage('');
      fetch(apiUrl('/api/isolation/participant-check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: introName.trim(),
          age: introAge.trim(),
          gender: introGender,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('기존 참여자 조회 실패');
          }
          const data = await response.json();
          if (data.exists && data.participant) {
            setExistingParticipant(data.participant);
            return;
          }
          proceedIntroScene(null);
        })
        .catch(() => {
          setErrorMessage('기존 참여자 확인 중 문제가 발생했습니다. 다시 시도해 주세요.');
        })
        .finally(() => {
          setCheckingExisting(false);
        });
      return;
    }

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      if (scene.sceneCode === OPTIONAL_INPUT_SCENE_CODE) {
        setAnswers((prev) => ({ ...prev, [scene.interaction.key]: '답장 안하기' }));
        moveNextScene();
        return;
      }
      setErrorMessage('문장을 입력해 주세요.');
      return;
    }
    setAnswers((prev) => ({ ...prev, [scene.interaction.key]: trimmedDraft }));
    moveNextScene();
  };

  const handleRetryExisting = () => {
    if (!existingParticipant?.id) {
      return;
    }
    setCheckingExisting(true);
    setErrorMessage('');
    fetch(apiUrl('/api/isolation/participant-restart'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: existingParticipant.id,
        userName: introName.trim(),
        age: introAge.trim(),
        gender: introGender,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('다시하기 초기화 실패');
        }
        const data = await response.json();
        if (data.cookieProfile) {
          setStepProfileCookie(data.cookieProfile);
        }
        proceedIntroScene(existingParticipant.id);
      })
      .catch(() => {
        setErrorMessage('다시하기 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        setCheckingExisting(false);
      });
  };

  const handleViewExistingResult = () => {
    if (!existingParticipant?.id) {
      return;
    }
    const numericAge = Number.parseInt(introAge, 10) || 0;
    setStepProfileCookie({
      id: existingParticipant.id,
      name: introName.trim(),
      generation: numericAge <= 40 ? 'YB' : 'OB',
      gender: introGender,
    });
    navigate('/isolation/step3', {
      state: {
        openTab: 'result',
      },
    });
  };

  const submitAll = async () => {
    setSubmitting(true);
    setErrorMessage('');
    setResult(null);

    const payload = {
      sessionId: `stepA-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      totalScenes: scenes.length,
      responses: answers,
      participantId: introResolvedParticipantId,
    };
    const numericAge = Number.parseInt(introAge, 10) || 0;
    const fallbackProfile = {
      id: null,
      name: introName.trim(),
      generation: numericAge <= 40 ? 'YB' : 'OB',
      gender: introGender,
    };

    // StepB에서 즉시 참조할 수 있도록 최소 프로필을 먼저 저장하고 화면을 전환한다.
    setStepProfileCookie(fallbackProfile);
    navigate('/isolation/step2');

    // 분석은 화면 전환 후에도 백그라운드로 계속 진행한다.
    fetch(apiUrl('/api/isolation/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('서버 응답 오류');
        }
        const data = await response.json();
        setStepProfileCookie(data.cookieProfile ?? {
          ...fallbackProfile,
          id: data.participantId ?? null,
        });
      })
      .catch(() => {});
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
            key={`${sceneIndex}-${playingIntroBridge ? 'bridge' : 'scene'}`}
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
        {showPanel && (
          <section className="stepa-player__panel stepa-player__panel--overlay">
            {scene.interaction.type === 'none' && (
              <p className="stepa-player__panel-title">다음 장면으로 이동 중...</p>
            )}

            {scene.interaction.type === 'choice' && (
              <>
                <p className="stepa-player__panel-title">{scene.interaction.label}</p>
                <div className="stepa-player__answer-field stepa-player__answer-field--choices">
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
                </div>
              </>
            )}

            {scene.interaction.type === 'input' && (
              <>
                <p className="stepa-player__panel-title">{scene.interaction.label}</p>
                {scene.sceneCode === 'SCENE_0' ? (
                  <div className="stepa-player__answer-field">
                    <span className="stepa-player__answer-label">내 정보</span>
                    <div className="stepa-player__intro-row">
                      <input
                        id="intro-name"
                        type="text"
                        className="stepa-player__choice-btn"
                        value={introName}
                        placeholder="이름 입력"
                        onChange={(e) => {
                          setIntroName(e.target.value);
                          setExistingParticipant(null);
                          setIntroResolvedParticipantId(null);
                        }}
                      />
                      <input
                        id="intro-age"
                        type="number"
                        className="stepa-player__choice-btn"
                        value={introAge}
                        placeholder="나이 입력"
                        onChange={(e) => {
                          setIntroAge(e.target.value);
                          setExistingParticipant(null);
                          setIntroResolvedParticipantId(null);
                        }}
                      />
                      <select
                        id="intro-gender"
                        className="stepa-player__choice-btn stepa-player__intro-select"
                        value={introGender}
                        onChange={(e) => {
                          setIntroGender(e.target.value);
                          setExistingParticipant(null);
                          setIntroResolvedParticipantId(null);
                        }}
                      >
                        <option value="">성별 선택</option>
                        <option value="M">남자</option>
                        <option value="F">여자</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="stepa-player__answer-field">
                    <label className="stepa-player__answer-label" htmlFor={scene.interaction.key}>
                      내 답변
                    </label>
                    <textarea
                      id={scene.interaction.key}
                      className="stepa-player__textarea stepa-player__textarea--in-field"
                      value={draft}
                      placeholder={scene.interaction.placeholder}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="btn-save stepa-player__submit-btn"
                  onClick={saveInputAndMove}
                  disabled={checkingExisting}
                >
                  {checkingExisting ? '확인 중...' : '다음'}
                </button>
                {scene.sceneCode === 'SCENE_0' && existingParticipant && (
                  <div className="stepa-player__existing-actions">
                    <button
                      type="button"
                      className="btn-save stepa-player__submit-btn"
                      disabled={checkingExisting}
                      onClick={handleRetryExisting}
                    >
                      다시 하기
                    </button>
                    <button
                      type="button"
                      className="btn-search stepa-player__submit-btn"
                      disabled={checkingExisting}
                      onClick={handleViewExistingResult}
                    >
                      결과 보기
                    </button>
                  </div>
                )}
              </>
            )}

            {isLastScene && (
              <button
                type="button"
                className="btn-save stepa-player__submit-btn"
                disabled={submitting}
                onClick={submitAll}
              >
                {submitting ? '분석 중...' : '결과 저장/분석'}
              </button>
            )}
          </section>
        )}
      </div>

      <footer className="stepa-player__footer">
        {/* <span>응답 저장: {responseCount}개</span> */}
        <div className="stepa-player__actions">
          {/* <button type="button" className="btn-clear stepa-player__action-btn" onClick={resetAll}>
            초기화
          </button> */}
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
