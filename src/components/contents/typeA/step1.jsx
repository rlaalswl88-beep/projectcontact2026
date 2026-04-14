import { useCallback, useMemo, useState } from 'react';
import './step1.css';

const PULSE_MIN = 40;
const PULSE_MAX = 100;
const HEALTHY_THRESHOLD = 62;

function clampPulse(n) {
  return Math.min(PULSE_MAX, Math.max(PULSE_MIN, Math.round(n)));
}

/** 단일 ECG 구간 (viewBox 0–100) — SVG 두 번 이어붙여 스크롤 */
const ECG_SEGMENT =
  'M0,24 L8,24 L12,8 L16,40 L22,24 L30,24 L34,10 L38,38 L44,24 L52,24 L56,12 L60,36 L66,24 L74,24 L78,6 L82,42 L88,24 L100,24';

export default function Step1() {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPulse, setCurrentPulse] = useState(70);
  const [messageDraft, setMessageDraft] = useState('');
  const [log, setLog] = useState([]);

  const isHealthy = currentPulse >= HEALTHY_THRESHOLD;
  const vitalColor = isHealthy ? '#00f5d4' : '#ff3366';

  const appendLog = useCallback((label) => {
    setLog((prev) => [...prev, label]);
  }, []);

  const bumpPulse = useCallback((delta, logLabel) => {
    setCurrentPulse((p) => clampPulse(p + delta));
    if (logLabel) appendLog(logLabel);
  }, [appendLog]);

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(3, s + 1));
  }, []);

  const handleDoor = () => {
    bumpPulse(2, '문 열기');
    goNext();
  };

  const handleReply = () => {
    bumpPulse(messageDraft.trim() ? 6 : 3, '답장');
    goNext();
  };

  const handleSkip = () => {
    bumpPulse(-10, '건너뛰기');
    goNext();
  };

  const handleHallway = (key) => {
    const map = {
      greet: { d: 8, label: '인사/대화' },
      nod: { d: 2, label: '끄덕임' },
      avoid: { d: -14, label: '피하기' },
    };
    const { d, label } = map[key];
    bumpPulse(d, label);
    goNext();
  };

  const handleReplay = () => {
    setCurrentStep(0);
    setCurrentPulse(70);
    setMessageDraft('');
    setLog([]);
  };

  const headerTitle = currentStep === 3 ? 'FINAL SOCIAL PULSE' : 'SOCIAL PULSE';

  const flowSummary = useMemo(() => {
    if (log.length === 0) return '선택 기록이 여기에 표시됩니다.';
    return log.join(' → ');
  }, [log]);

  return (
    <div className="sp-proto">
      <header className="sp-proto__header">
        <p className="sp-proto__header-title">{headerTitle}</p>
        <div
          className={
            'sp-proto__vital-row ' +
            (isHealthy ? 'sp-proto__vital-row--healthy' : 'sp-proto__vital-row--stress')
          }
        >
          <div className="sp-proto__ecg-wrap" aria-hidden>
            <svg
              className="sp-proto__ecg-svg"
              viewBox="0 0 200 48"
              preserveAspectRatio="none"
            >
              <path d={ECG_SEGMENT} stroke={vitalColor} />
              <path d={ECG_SEGMENT} transform="translate(100,0)" stroke={vitalColor} />
            </svg>
          </div>
          <span className="sp-proto__pulse-num" style={{ color: vitalColor }}>
            {currentPulse}%
          </span>
        </div>
      </header>

      <main className="sp-proto__body">
        {currentStep === 0 && (
          <>
            <h2 className="sp-proto__scene-title">DAY 1: STEP OUTSIDE</h2>
            <div className="sp-proto__scene">
              <button
                type="button"
                className="sp-proto__door"
                onClick={handleDoor}
                aria-label="문 열고 다음으로"
              >
                <span className="sp-proto__door-handle" />
              </button>
              <p className="sp-proto__door-hint">▼ 손잡이를 눌러 나가기</p>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <>
            <h2 className="sp-proto__scene-title">THE MESSAGE</h2>
            <div className="sp-proto__scene">
              <div className="sp-proto__phone">
                친구가 메시지를 보냈습니다. 한동안 연락이 없었어요…
              </div>
              <div className="sp-proto__input-row">
                <input
                  className="sp-proto__input"
                  type="text"
                  placeholder="답장을 입력…"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                />
                <div className="sp-proto__msg-actions">
                  <button type="button" className="sp-proto__text-btn" onClick={handleReply}>
                    REPLY
                  </button>
                  <button type="button" className="sp-proto__text-btn" onClick={handleSkip}>
                    SKIP
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h2 className="sp-proto__scene-title">THE HALLWAY</h2>
            <div className="sp-proto__scene">
              <div className="sp-proto__silhouette" aria-hidden />
              <div className="sp-proto__choices">
                <button
                  type="button"
                  className="sp-proto__choice sp-proto__choice--cyan"
                  onClick={() => handleHallway('greet')}
                >
                  <span className="sp-proto__choice-icon" aria-hidden>
                    💬
                  </span>
                  GREET
                </button>
                <button
                  type="button"
                  className="sp-proto__choice sp-proto__choice--yellow"
                  onClick={() => handleHallway('nod')}
                >
                  <span className="sp-proto__choice-icon" aria-hidden>
                    👋
                  </span>
                  NOD
                </button>
                <button
                  type="button"
                  className="sp-proto__choice sp-proto__choice--red"
                  onClick={() => handleHallway('avoid')}
                >
                  <span className="sp-proto__choice-icon" aria-hidden>
                    🙈
                  </span>
                  AVOID
                </button>
              </div>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h2 className="sp-proto__scene-title">SUMMARY</h2>
            <div className="sp-proto__scene">
              <p className="sp-proto__summary-flow">{flowSummary}</p>
              <div className="sp-proto__ring-wrap">
                <div
                  className={
                    'sp-proto__ring ' + (isHealthy ? 'sp-proto__ring--healthy' : '')
                  }
                  style={{
                    '--pct': currentPulse,
                    '--ring-color': vitalColor,
                  }}
                >
                  <div className="sp-proto__ring-inner" style={{ color: vitalColor }}>
                    {currentPulse}%
                  </div>
                </div>
              </div>
              <button type="button" className="sp-proto__summary-btn" onClick={handleReplay}>
                SUMMARY & REPLAY
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
