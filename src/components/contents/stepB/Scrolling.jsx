import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Scrolling.css';

const DEPTH = 7600;
const DRAG_LIMIT = 36;

// 숫자를 정해진 범위 안에 가둡니다.
// 예: 진행률은 0~1, 시점 회전은 너무 돌아가지 않게 제한합니다.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 현재 값에서 목표 값으로 조금씩 이동합니다.
// 이 함수 덕분에 카메라가 순간이동하지 않고 부드럽게 따라갑니다.
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function revealBetween(progress, start, fullyVisible, end) {
  const fadeIn = smoothstep(start, fullyVisible, progress);
  const fadeOut = 1 - smoothstep(fullyVisible, end, progress);
  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

// 3D 공간 안에 배치할 흰색 기둥들을 미리 만듭니다.
// 각 기둥은 CSS 변수로 x/y/z 위치와 높이를 받아서 깊이감 있게 놓입니다.
function buildDepthItems() {
  return Array.from({ length: 72 }, (_, index) => {
    const lane = index % 6;
    const side = lane < 3 ? -1 : 1;
    const distance = -260 - index * 108;
    const x = side * (180 + (lane % 3) * 170);
    const y = ((index % 9) - 4) * 38;
    const height = 76 + (index % 5) * 32;
    const opacity = 0.18 + (index % 4) * 0.08;

    return {
      id: `pillar-${index}`,
      className: index % 7 === 0 ? 'scroll3d__pillar scroll3d__pillar--tall' : 'scroll3d__pillar',
      style: {
        '--x': `${x}px`,
        '--y': `${y}px`,
        '--z': `${distance}px`,
        '--h': `${height}px`,
        '--o': opacity,
      },
    };
  });
}

// 사용자가 지나가는 원형 게이트를 만듭니다.
// Z축으로 멀리 배치해서 스크롤할 때 앞으로 지나가는 것처럼 보이게 합니다.
function buildRings() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `ring-${index}`,
    style: {
      '--z': `${-520 - index * 560}px`,
      '--size': `${420 + (index % 4) * 90}px`,
      '--tilt': `${index % 2 === 0 ? 0 : 90}deg`,
    },
  }));
}

function Scrolling() {
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const dragStartRef = useRef(null);
  const touchStartRef = useRef(null);
  const rafRef = useRef(0);

  // target 계열 ref는 "목표값"입니다.
  // 실제 화면 값은 requestAnimationFrame 안에서 이 값을 천천히 따라갑니다.
  const targetLookRef = useRef({ x: 0, y: 0 });
  const targetProgressRef = useRef(0);
  const isRestoringRef = useRef(false);

  // 실제 브라우저 문서 스크롤이 아니라, stepB 안에서만 쓰는 가상 스크롤 진행률입니다.
  const [scrollProgress, setScrollProgress] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const destinationActive = scrollProgress > 0.92;

  const depthItems = useMemo(buildDepthItems, []);
  const rings = useMemo(buildRings, []);

  // 휠/터치/키보드 입력을 가상 스크롤 진행률에 더합니다.
  const addProgress = useCallback((delta) => {
    targetProgressRef.current = clamp(targetProgressRef.current + delta, 0, 1);
  }, []);

  useEffect(() => {
    // stepB는 한 화면 고정형 인터랙션입니다.
    // 문서 전체가 실제로 내려가지 않도록 body 스크롤을 잠급니다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'auto' });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const handleWheel = (event) => {
      // 마우스 휠은 페이지 이동이 아니라 3D 공간 전진/후진으로 사용합니다.
      event.preventDefault();
      addProgress(event.deltaY / 19500);
    };

    const handleTouchStart = (event) => {
      if (event.target.closest('button')) {
        touchStartRef.current = null;
        return;
      }

      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (touchStartRef.current === null) return;

      // 모바일 세로 스와이프도 휠처럼 가상 스크롤 값으로 변환합니다.
      const currentY = event.touches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - currentY;
      touchStartRef.current = currentY;
      event.preventDefault();
      addProgress(delta / 3600);
    };

    const handleKeyDown = (event) => {
      // 키보드로도 테스트할 수 있게 방향키와 PageUp/PageDown을 지원합니다.
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        addProgress(0.045);
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        addProgress(-0.045);
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [addProgress]);

  useEffect(() => {
    const tick = () => {
      // 시점 회전도 목표값을 바로 적용하지 않고 천천히 따라가게 합니다.
      setLook((current) => {
        const next = {
          x: lerp(current.x, targetLookRef.current.x, 0.12),
          y: lerp(current.y, targetLookRef.current.y, 0.12),
        };

        if (Math.abs(next.x - current.x) < 0.01 && Math.abs(next.y - current.y) < 0.01) {
          return current;
        }

        return next;
      });

      // 진행률도 매 프레임 보간합니다.
      // 복귀 중에는 더 느린 속도를 써서 처음으로 끌려가는 느낌을 냅니다.
      setScrollProgress((current) => {
        const speed = isRestoringRef.current ? 0.04 : 0.055;
        const next = lerp(current, targetProgressRef.current, speed);

        if (Math.abs(next - current) < 0.0005) {
          if (targetProgressRef.current === 0) {
            isRestoringRef.current = false;
          }

          return targetProgressRef.current;
        }

        return next;
      });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!gyroEnabled) return undefined;

    const handleOrientation = (event) => {
      // 모바일 기울기 값을 좌우/상하 시점 회전으로 변환합니다.
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;

      targetLookRef.current = {
        x: clamp(gamma * 1.15, -DRAG_LIMIT, DRAG_LIMIT),
        y: clamp((beta - 55) * -0.55, -22, 22),
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [gyroEnabled]);

  const handlePointerDown = (event) => {
    // 투명 클릭 영역이나 컨트롤 버튼에서 시작한 이벤트는 드래그로 처리하지 않습니다.
    if (event.target.closest('button')) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      look: { ...targetLookRef.current },
    };
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragStartRef.current && event.pointerType === 'mouse' && !gyroEnabled) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      // 마우스가 화면 중앙에서 벗어난 정도를 시점 회전으로 사용합니다.
      // 별도 드래그 없이도 커서를 옮기면 주변을 살짝 둘러보는 효과가 납니다.
      const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

      targetLookRef.current = {
        x: clamp(offsetX * -42, -DRAG_LIMIT, DRAG_LIMIT),
        y: clamp(offsetY * -34, -26, 26),
      };
      return;
    }

    if (!dragStartRef.current) return;

    // 포인터 이동 거리를 회전 각도로 변환해서 사용자가 주변을 둘러볼 수 있게 합니다.
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    targetLookRef.current = {
      x: clamp(dragStartRef.current.look.x - deltaX * 0.12, -DRAG_LIMIT, DRAG_LIMIT),
      y: clamp(dragStartRef.current.look.y - deltaY * 0.1, -26, 26),
    };
  };

  const handlePointerUp = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      if (!gyroEnabled) {
        // 드래그를 놓으면 다시 정면으로 돌아옵니다.
        // 자이로 사용 중에는 기기 기울기를 우선하므로 자동 복귀하지 않습니다.
        targetLookRef.current = { x: 0, y: 0 };
      }
    }
  };

  const handleRecenter = () => {
    targetLookRef.current = { x: 0, y: 0 };
  };

  const handleRestoreScroll = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    // 마지막 Connection Point 클릭 시 처음으로 돌아갑니다.
    // scrollProgress를 바로 0으로 만들지 않고 목표값만 0으로 바꿔 자연스럽게 복귀시킵니다.
    targetLookRef.current = { x: 0, y: 0 };
    isRestoringRef.current = true;
    targetProgressRef.current = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleEnableGyro = async () => {
    const orientationEvent = window.DeviceOrientationEvent;

    if (orientationEvent && typeof orientationEvent.requestPermission === 'function') {
      // iOS Safari는 자이로 센서 사용 전에 사용자 클릭 기반 권한 요청이 필요합니다.
      const permission = await orientationEvent.requestPermission();
      setGyroEnabled(permission === 'granted');
      return;
    }

    setGyroEnabled(true);
  };

  // 0~1 진행률을 실제 3D 카메라 이동 거리로 환산합니다.
  const cameraZ = scrollProgress * DEPTH;
  const routeProgress = Math.round(scrollProgress * 100);
  const stageStyle = {
    '--camera-z': `${cameraZ}px`,
    '--look-x': `${look.x}deg`,
    '--look-y': `${look.y}deg`,
    '--progress': scrollProgress,
  };
  const viewportStyle = {
    '--progress': scrollProgress,
  };
  const revealStyles = {
    one: { '--reveal': revealBetween(scrollProgress, 0.03, 0.1, 0.24) },
    two: { '--reveal': revealBetween(scrollProgress, 0.26, 0.38, 0.54) },
    three: { '--reveal': revealBetween(scrollProgress, 0.52, 0.67, 0.82) },
    destination: { '--reveal': smoothstep(0.78, 0.92, scrollProgress) },
  };

  return (
    <section className="scroll3d" ref={shellRef}>
      <div
        className="scroll3d__viewport"
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={viewportStyle}
        tabIndex={0}
      >
        <div className="scroll3d__hud" aria-live="polite">
          <div>
            <p className="scroll3d__kicker">STEP B / SCROLLING FIELD</p>
            <h2>고립의 복도를 지나 연결 지점으로 이동</h2>
          </div>
          <span>{routeProgress}%</span>
        </div>

        <div className="scroll3d__controls">
          <button type="button" onClick={handleRecenter}>
            Recenter
          </button>
          <button type="button" onClick={handleEnableGyro} aria-pressed={gyroEnabled}>
            {gyroEnabled ? 'Gyro On' : 'Gyro'}
          </button>
        </div>

        <div className="scroll3d__progress" aria-hidden>
          <span style={{ transform: `scaleY(${Math.max(scrollProgress, 0.015)})` }} />
        </div>

        <div className="scroll3d__hint">
          <span>Scroll</span>
          <span>Drag to look around</span>
        </div>

        <button
          type="button"
          className="scroll3d__destination-hit"
          onPointerDown={handleRestoreScroll}
          onClick={handleRestoreScroll}
          data-visible={destinationActive}
          aria-label="처음 위치로 돌아가기"
        />

        <div className="scroll3d__camera" style={stageStyle} aria-hidden>
          <div className="scroll3d__world">
            <div className="scroll3d__vanish-line scroll3d__vanish-line--left" />
            <div className="scroll3d__vanish-line scroll3d__vanish-line--right" />
            <div className="scroll3d__floor">
              {Array.from({ length: 34 }, (_, index) => (
                <span key={`grid-${index}`} style={{ '--z': `${-index * 240}px` }} />
              ))}
            </div>

            {rings.map((ring) => (
              <div className="scroll3d__ring" key={ring.id} style={ring.style} />
            ))}

            {depthItems.map((item) => (
              <span key={item.id} className={item.className} style={item.style} />
            ))}

            <div className="scroll3d__chapter scroll3d__chapter--one" style={revealStyles.one}>
              <span>01</span>
              <strong>Signal Lost</strong>
            </div>
            <div className="scroll3d__chapter scroll3d__chapter--two" style={revealStyles.two}>
              <span>02</span>
              <strong>Trace Contact</strong>
            </div>
            <div className="scroll3d__chapter scroll3d__chapter--three" style={revealStyles.three}>
              <span>03</span>
              <strong>Open Channel</strong>
            </div>
            <div className="scroll3d__destination" style={revealStyles.destination} data-active={destinationActive}>
              <span />
              <strong>Connection Point</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Scrolling;
