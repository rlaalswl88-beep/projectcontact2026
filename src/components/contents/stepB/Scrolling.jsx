import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, useScroll } from "@react-three/drei";
import * as THREE from "three";
import "./Scrolling.css";
import { Environment } from '@react-three/drei';


const DEPTH = 7600;
const DRAG_LIMIT = 36;
// 마지막 지점 클릭 후 위로 복귀하는 속도입니다.
// 값을 키우면 빠르게 끌려 올라가고, 낮추면 천천히 따라 올라갑니다.
const RESTORE_SCROLL_SPEED = 0.012;
const BUBBLE_COUNT = 86;
const BUBBLE_FAR_Z = -92;
const BUBBLE_NEAR_Z = 5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function randomRange(seed, min, max) {
  return min + seededRandom(seed) * (max - min);
}

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
      className:
        index % 7 === 0
          ? "scroll3d__pillar scroll3d__pillar--tall"
          : "scroll3d__pillar",
      style: {
        "--x": `${x}px`,
        "--y": `${y}px`,
        "--z": `${distance}px`,
        "--h": `${height}px`,
        "--o": opacity,
      },
    };
  });
}

function buildRings() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `ring-${index}`,
    style: {
      "--z": `${-520 - index * 560}px`,
      "--size": `${420 + (index % 4) * 90}px`,
      "--tilt": `${index % 2 === 0 ? 0 : 90}deg`,
    },
  }));
}

function buildBubbleData() {
  return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
    const seed = index + 1;
    const layer = index % 10;
    const near = layer > 6;
    const mid = layer > 2 && layer <= 6;
    const angle = randomRange(seed + 1, 0, Math.PI * 2);
    const radius = near
      ? randomRange(seed + 2, 2.8, 7.4)
      : randomRange(seed + 2, 0.2, mid ? 4.2 : 2.4);

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.72 + randomRange(seed + 3, -1.5, 1.5),
      z: randomRange(seed + 4, BUBBLE_FAR_Z, -8),
      radius: near
        ? randomRange(seed + 5, 0.055, 0.15)
        : randomRange(seed + 5, 0.012, mid ? 0.056 : 0.026),
      opacity: near
        ? randomRange(seed + 6, 0.12, 0.22)
        : randomRange(seed + 6, 0.035, mid ? 0.12 : 0.07),
      speed: near
        ? randomRange(seed + 7, 15, 26)
        : randomRange(seed + 7, 5, mid ? 15 : 9),
      buoyancy: randomRange(seed + 8, 0.02, near ? 0.1 : 0.05),
      drift: randomRange(seed + 9, 0.08, near ? 0.42 : 0.22),
      phase: randomRange(seed + 10, 0, Math.PI * 2),
      squash: near
        ? randomRange(seed + 11, 0.72, 1.28)
        : randomRange(seed + 11, 0.88, 1.12),
    };
  });
}

function Bubbles({ scrollVelocityRef, scrollInputRef, pointerMotionRef }) {
  const meshRef = useRef(null);
  const groupRef = useRef(null);
  const bubbleEnergyRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scroll = useScroll();
  const { mouse } = useThree();
  const bubbles = useMemo(buildBubbleData, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    const scrollDelta = Math.abs(scroll.delta || 0);
    const virtualVelocity = scrollVelocityRef?.current || 0;
    const wheelInput = scrollInputRef?.current || 0;
    const pointerMotion = pointerMotionRef?.current || 0;

    // 물방울 발생 조건을 정하는 입력 세기입니다.
    // scrollDelta: drei ScrollControls의 실제 스크롤 변화량
    // virtualVelocity: 이 컴포넌트에서 쓰는 가상 스크롤 속도
    // wheelInput: 휠/터치/키보드 입력이 들어온 순간을 직접 누적한 값입니다. 전 구간 반응 보강용입니다.
    // pointerMotion: 마우스를 움직였을 때 생기는 물속 흔들림
    // 각 곱셈 수치를 올리면 작은 입력에도 물방울이 더 쉽게 나오고, 낮추면 더 강하게 움직여야 나옵니다.
    const inputPower = clamp(
      scrollDelta * 4 +
        virtualVelocity * 48 +
        wheelInput * 2.8 +
        pointerMotion * 0.32,
      0,
      1,
    );

    // inputPower가 0.015 아래면 거의 반응하지 않고, 0.16 이상이면 충분히 보입니다.
    // 더 빨리 나오게 하려면 0.015/0.16을 낮추고, 더 늦게 나오게 하려면 높이면 됩니다.
    const targetEnergy = smoothstep(0.03, 0.3, inputPower);

    // 물방울이 바로 번쩍 켜지지 않게 지연시키는 값입니다.
    // 0.035는 켜질 때 속도, 0.018은 사라질 때 속도입니다. 값을 키우면 반응이 빨라집니다.
    const energyLerp = targetEnergy > bubbleEnergyRef.current ? 0.075 : 0.03;
    bubbleEnergyRef.current = lerp(
      bubbleEnergyRef.current,
      targetEnergy,
      energyLerp,
    );

    // 실제 화면에 보이는 정도입니다.
    // 0.025 아래에서는 숨고, 0.28 이상이면 거의 완전히 보입니다.
    const visibility = smoothstep(0.025, 0.28, bubbleEnergyRef.current);

    // 기포가 Z축 깊은 곳에서 카메라 쪽으로 올라오는 속도입니다.
    // 0.035는 기본 속도, 0.62는 입력이 강할 때 추가되는 가속량입니다.
    const zAcceleration = 0.035 + bubbleEnergyRef.current * 0.62;

    mesh.visible = visibility > 0.01;
    if (!mesh.visible) return;

    group.rotation.y = lerp(group.rotation.y, mouse.x * 0.18, 0.045);
    group.rotation.x = lerp(group.rotation.x, -mouse.y * 0.12, 0.045);
    group.position.x = lerp(group.position.x, mouse.x * 0.55, 0.05);
    group.position.y = lerp(group.position.y, mouse.y * 0.36, 0.05);

    bubbles.forEach((bubble, index) => {
      bubble.z += delta * bubble.speed * zAcceleration;
      bubble.y += delta * bubble.buoyancy;

      if (bubble.z > BUBBLE_NEAR_Z) {
        const seed = state.clock.elapsedTime * 100 + index;
        const angle = randomRange(seed + 1, 0, Math.PI * 2);
        const radius = randomRange(seed + 2, 0.2, index % 10 > 6 ? 7.4 : 4.4);
        bubble.x = Math.cos(angle) * radius;
        bubble.y =
          Math.sin(angle) * radius * 0.72 + randomRange(seed + 3, -1.2, 1.2);
        bubble.z = randomRange(seed + 4, BUBBLE_FAR_Z, -50);
      }

      const proximity = smoothstep(BUBBLE_FAR_Z, BUBBLE_NEAR_Z, bubble.z);
      const driftX =
        Math.sin(state.clock.elapsedTime * 0.65 + bubble.phase) * bubble.drift;
      const driftY =
        Math.cos(state.clock.elapsedTime * 0.48 + bubble.phase * 1.7) *
        bubble.drift *
        0.35;
      const radialPush = 1 + proximity * 1.85;
      const scale = bubble.radius * (0.42 + proximity * 4.4) * visibility;

      dummy.position.set(
        (bubble.x + driftX) * radialPush,
        (bubble.y + driftY) * radialPush,
        bubble.z,
      );
      dummy.scale.set(scale * bubble.squash, scale, scale * 0.82);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BUBBLE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
  color="#1a97c9"
  transparent={true}
  opacity={0.2}          /* 투명도를 0.1 수준으로 확 낮춰서 뒷배경이 비치게 함 */
  roughness={0}
  metalness={0.1}        /* 금속성을 낮춰서 쇳덩이 같은 탁한 느낌을 없앰 */
  clearcoat={1}          /* 유리 코팅 유지 */
  clearcoatRoughness={0}
  envMapIntensity={2}  /* 반사광 강도를 살짝 낮춰서 자연스럽게 조절 */
  depthWrite={false}
/>
      </instancedMesh>
    </group>
  );
}

function BubbleField({ scrollVelocityRef, scrollInputRef, pointerMotionRef }) {
  return (
    <Canvas
      className="scroll3d__bubbles"
      camera={{ position: [0, 0, 8], fov: 58, near: 0.1, far: 140 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 3.2, 5]} intensity={4.6} color="#ffffff" />
      {/* ... 나머지 조명 유지 ... */}
      
      {/* 이거 무조건 추가! (보이지 않는 빛들을 배치해서 물방울 겉면을 반짝이게 함) */}
      <Environment preset="night" blur={1} />
      
      <ScrollControls pages={6} damping={0.18} style={{ scrollbarWidth: 'none' }}>
        <Bubbles scrollVelocityRef={scrollVelocityRef} scrollInputRef={scrollInputRef} pointerMotionRef={pointerMotionRef} />
      </ScrollControls>
    </Canvas>
  );
}
function Scrolling() {
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const dragStartRef = useRef(null);
  const touchStartRef = useRef(null);
  const rafRef = useRef(0);
  const pointerPointRef = useRef(null);

  const targetLookRef = useRef({ x: 0, y: 0 });
  const targetProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const scrollInputRef = useRef(0);
  const pointerMotionRef = useRef(0);
  const isRestoringRef = useRef(false);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const destinationActive = scrollProgress > 0.92;

  const depthItems = useMemo(buildDepthItems, []);
  const rings = useMemo(buildRings, []);

  const addProgress = useCallback((delta) => {
    targetProgressRef.current = clamp(targetProgressRef.current + delta, 0, 1);
    scrollInputRef.current = clamp(
      scrollInputRef.current + Math.abs(delta) * 44,
      0,
      1,
    );
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "auto" });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      addProgress(event.deltaY / 19500);
    };

    const handleTouchStart = (event) => {
      if (event.target.closest("button")) {
        touchStartRef.current = null;
        return;
      }

      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (touchStartRef.current === null) return;

      const currentY = event.touches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - currentY;
      touchStartRef.current = currentY;
      event.preventDefault();
      addProgress(delta / 3600);
    };

    const handleKeyDown = (event) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        addProgress(0.045);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        addProgress(-0.045);
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addProgress]);

  useEffect(() => {
    const tick = () => {
      pointerMotionRef.current = lerp(pointerMotionRef.current, 0, 0.045);
      scrollInputRef.current = lerp(scrollInputRef.current, 0, 0.055);

      setLook((current) => {
        const next = {
          x: lerp(current.x, targetLookRef.current.x, 0.12),
          y: lerp(current.y, targetLookRef.current.y, 0.12),
        };

        if (
          Math.abs(next.x - current.x) < 0.01 &&
          Math.abs(next.y - current.y) < 0.01
        ) {
          return current;
        }

        return next;
      });

      setScrollProgress((current) => {
        const speed = isRestoringRef.current ? RESTORE_SCROLL_SPEED : 0.055;
        const next = lerp(current, targetProgressRef.current, speed);
        scrollVelocityRef.current = lerp(
          scrollVelocityRef.current,
          Math.abs(next - current),
          0.32,
        );

        if (Math.abs(next - current) < 0.0005) {
          if (targetProgressRef.current === 0) {
            isRestoringRef.current = false;
          }

          scrollVelocityRef.current = lerp(scrollVelocityRef.current, 0, 0.22);
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
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;

      targetLookRef.current = {
        x: clamp(gamma * 1.15, -DRAG_LIMIT, DRAG_LIMIT),
        y: clamp((beta - 55) * -0.55, -22, 22),
      };
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () =>
      window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [gyroEnabled]);

  const handlePointerDown = (event) => {
    if (event.target.closest("button")) return;

    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      look: { ...targetLookRef.current },
    };
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (
      !dragStartRef.current &&
      event.pointerType === "mouse" &&
      !gyroEnabled
    ) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
      const previousPoint = pointerPointRef.current;
      const motion = previousPoint
        ? Math.hypot(
            event.clientX - previousPoint.x,
            event.clientY - previousPoint.y,
          )
        : Math.hypot(event.movementX || 0, event.movementY || 0);

      pointerPointRef.current = { x: event.clientX, y: event.clientY };
      pointerMotionRef.current = clamp(
        pointerMotionRef.current + motion / 90,
        0,
        1,
      );

      targetLookRef.current = {
        x: clamp(offsetX * -42, -DRAG_LIMIT, DRAG_LIMIT),
        y: clamp(offsetY * -34, -26, 26),
      };
      return;
    }

    if (!dragStartRef.current) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    targetLookRef.current = {
      x: clamp(
        dragStartRef.current.look.x - deltaX * 0.12,
        -DRAG_LIMIT,
        DRAG_LIMIT,
      ),
      y: clamp(dragStartRef.current.look.y - deltaY * 0.1, -26, 26),
    };
  };

  const handlePointerUp = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      pointerPointRef.current = null;
      if (!gyroEnabled) {
        targetLookRef.current = { x: 0, y: 0 };
      }
    }
  };

  const handleRestoreScroll = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    targetLookRef.current = { x: 0, y: 0 };
    isRestoringRef.current = true;
    targetProgressRef.current = 0;
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const cameraZ = scrollProgress * DEPTH;
  const routeProgress = Math.round(scrollProgress * 100);
  const stageStyle = {
    "--camera-z": `${cameraZ}px`,
    "--look-x": `${look.x}deg`,
    "--look-y": `${look.y}deg`,
    "--progress": scrollProgress,
  };
  const viewportStyle = {
    "--progress": scrollProgress,
  };
  const revealStyles = {
    one: { "--reveal": revealBetween(scrollProgress, 0.03, 0.1, 0.24) },
    two: { "--reveal": revealBetween(scrollProgress, 0.26, 0.38, 0.54) },
    three: { "--reveal": revealBetween(scrollProgress, 0.52, 0.67, 0.82) },
    destination: { "--reveal": smoothstep(0.78, 0.92, scrollProgress) },
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
            <p className="scroll3d__kicker">STEP B / 심해</p>
          </div>
          <span>{routeProgress}%</span>
        </div>

        <div className="scroll3d__progress" aria-hidden>
          <span
            style={{ transform: `scaleY(${Math.max(scrollProgress, 0.015)})` }}
          />
        </div>

        <BubbleField
          scrollVelocityRef={scrollVelocityRef}
          scrollInputRef={scrollInputRef}
          pointerMotionRef={pointerMotionRef}
        />

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
                <span
                  key={`grid-${index}`}
                  style={{ "--z": `${-index * 240}px` }}
                />
              ))}
            </div>

            {rings.map((ring) => (
              <div
                className="scroll3d__ring"
                key={ring.id}
                style={ring.style}
              />
            ))}

            {depthItems.map((item) => (
              <span
                key={item.id}
                className={item.className}
                style={item.style}
              />
            ))}

            <div
              className="scroll3d__chapter scroll3d__chapter--one"
              style={revealStyles.one}
            >
              <span>01</span>
              <strong>Signal Lost</strong>
            </div>
            <div
              className="scroll3d__chapter scroll3d__chapter--two"
              style={revealStyles.two}
            >
              <span>02</span>
              <strong>Trace Contact</strong>
            </div>
            <div
              className="scroll3d__chapter scroll3d__chapter--three"
              style={revealStyles.three}
            >
              <span>03</span>
              <strong>Open Channel</strong>
            </div>
            <div
              className="scroll3d__destination"
              style={revealStyles.destination}
              data-active={destinationActive}
            >
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
