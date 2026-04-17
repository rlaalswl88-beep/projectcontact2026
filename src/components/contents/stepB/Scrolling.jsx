
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Scrolling.css";

const BUBBLE_CONTENTS = [
  { label: "청년 고립", x: 18, y: 42, size: "lg" },
  { label: "취업 불안", x: 72, y: 48, size: "md" },
  { label: "관계 단절", x: 30, y: 64, size: "md" },
  { label: "경제 압박", x: 64, y: 70, size: "sm" },
  { label: "무기력", x: 46, y: 78, size: "sm" },
  { label: "도움 요청", x: 80, y: 82, size: "sm" },
];

// 연출 타이밍 커스텀 포인트
const TIMING = {
  sparkStart: 0.93, // 이 값을 올리면 빛 등장 시점이 늦어짐
  bubbleStart: 0.54, // 이 값을 낮추면 물방울 시작이 빨라짐
  bubbleGap: 0.055, // 물방울 간 등장 간격
  bubbleFadeSpan: 0.18, // 개별 물방울 페이드 인 길이
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function Scrolling() {
  const sectionRef = useRef(null);
  const ascendFrameRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isAscending, setIsAscending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const updateProgress = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const sectionHeight = sectionRef.current.offsetHeight;
      const scrollable = Math.max(sectionHeight - window.innerHeight, 1);
      const raw = (window.scrollY - start) / scrollable;
      setProgress(clamp(raw, 0, 1));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (ascendFrameRef.current) {
        cancelAnimationFrame(ascendFrameRef.current);
      }
    };
  }, []);

  const scene1Opacity = clamp((0.42 - progress) / 0.2, 0, 1);
  const scene2Opacity =
    clamp((progress - 0.22) / 0.16, 0, 1) * clamp((0.8 - progress) / 0.18, 0, 1);
  const scene3Opacity = clamp((progress - 0.56) / 0.18, 0, 1);

  const cameraShift = progress * 20;
  const scene2Fall = clamp((progress - 0.28) / 0.4, 0, 1);
  const scene3Depth = clamp((progress - 0.6) / 0.4, 0, 1);
  const sparkVisible = progress > TIMING.sparkStart && !isAscending;

  const handleSparkClick = () => {
    if (!sectionRef.current || isAscending) return;
    setIsAscending(true);
    const startY = window.scrollY;
    const targetY = window.scrollY + sectionRef.current.getBoundingClientRect().top;
    const duration = 1600;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const nextY = startY + (targetY - startY) * eased;

      window.scrollTo({ top: nextY, behavior: "auto" });

      if (t < 1) {
        ascendFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      setIsAscending(false);
      navigate("/isolation/step3");
    };

    ascendFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <section ref={sectionRef} className="scroll-proto">
      <div className="scroll-proto__sticky">
        <div
          className="scroll-proto__camera"
          style={{ transform: `translateY(-${cameraShift}vh)` }}
        >
          <div
            className="scroll-proto__scene scroll-proto__scene--room"
            style={{
              opacity: scene1Opacity,
              filter: `blur(${(1 - scene1Opacity) * 6}px)`,
              transform: `scale(${0.96 + scene1Opacity * 0.04})`,
            }}
          >
            <div className="scroll-proto__room-lines" aria-hidden />
            <div className="scroll-proto__window-frame" aria-hidden />
            <div className="scroll-proto__window-glow" aria-hidden />
            <div className="scroll-proto__person scroll-proto__person--stand" />
            <p className="scroll-proto__scene-title">A DAY'S JOURNEY.</p>
          </div>

          <div
            className="scroll-proto__scene scroll-proto__scene--vortex"
            style={{
              opacity: scene2Opacity,
              filter: `blur(${(1 - scene2Opacity) * 5}px)`,
              transform: `scale(${0.95 + scene2Opacity * 0.05})`,
            }}
          >
            <div
              className="scroll-proto__vortex-hole"
              style={{ transform: `translate(-50%, -50%) scale(${1 + scene2Fall * 0.35})` }}
            />
            <div
              className="scroll-proto__person scroll-proto__person--fall"
              style={{ transform: `translate(-50%, ${scene2Fall * 170}px) rotate(${scene2Fall * 20}deg)` }}
            />
            <p className="scroll-proto__scene-subtitle">DOWNSCROLL TO DEEPEN.</p>
          </div>

          <div
            className="scroll-proto__scene scroll-proto__scene--underwater"
            style={{
              opacity: scene3Opacity,
              filter: `blur(${(1 - scene3Opacity) * 3}px)`,
              transform: `scale(${0.95 + scene3Opacity * 0.05})`,
            }}
          >
            <div
              className="scroll-proto__deep-person"
              style={{ transform: `translate(-50%, ${10 + scene3Depth * 35}%)` }}
            />
            <div className="scroll-proto__scene-subtitle scroll-proto__scene-subtitle--dark">
              {progress < TIMING.sparkStart ? "끝없이 내려갑니다." : "A SINGLE SPARK."}
            </div>

            {BUBBLE_CONTENTS.map((bubble, index) => {
              const appearAt = TIMING.bubbleStart + index * TIMING.bubbleGap;
              const alpha = clamp((progress - appearAt) / TIMING.bubbleFadeSpan, 0, 1);
              return (
                <div
                  key={bubble.label}
                  className={`scroll-proto__bubble scroll-proto__bubble--${bubble.size}`}
                  style={{
                    left: `${bubble.x}%`,
                    top: `${bubble.y}%`,
                    opacity: alpha * scene3Opacity,
                    transform: `translate(-50%, ${26 - alpha * 24}px) scale(${0.8 + alpha * 0.2})`,
                  }}
                >
                  <span>{bubble.label}</span>
                </div>
              );
            })}

            <div className="scroll-proto__floaters" aria-hidden>
              {Array.from({ length: 22 }).map((_, index) => (
                <span
                  key={`float-${index}`}
                  className="scroll-proto__floater"
                  style={{
                    left: `${5 + ((index * 9) % 88)}%`,
                    animationDelay: `${index * 0.28}s`,
                    opacity: scene3Opacity * 0.75,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {sparkVisible && (
          <button
            type="button"
            className="scroll-proto__spark-button"
            onClick={handleSparkClick}
            aria-label="빛으로 올라가기"
          >
            <span className="scroll-proto__spark-core" />
          </button>
        )}

        {isAscending && <p className="scroll-proto__hint">빛을 따라 수면 위로 상승 중...</p>}
      </div>
    </section>
  );
}

export default Scrolling;