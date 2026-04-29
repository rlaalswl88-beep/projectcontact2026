import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, useScroll } from "@react-three/drei";
import * as THREE from "three";
import "./Scrolling.css";
import { Environment } from '@react-three/drei';
import headlineData from "./B_deta.json";


const DEPTH = 12800;
const DRAG_LIMIT = 45; // 정면 기준 좌우 시야 회전 한계입니다. 45면 왼쪽/오른쪽 각각 45도까지 봅니다.
const LOOK_TARGET_FOLLOW = 0.07; // 마우스 위치로 목표 시선이 따라가는 속도입니다. 낮추면 수막 저항처럼 더 무겁습니다.
const LOOK_RENDER_FOLLOW = 0.04; // 실제 화면 시선이 목표 시선을 따라가는 속도입니다. 낮추면 휙 도는 느낌이 줄어듭니다.
// 마지막 지점 클릭 후 위로 복귀하는 속도입니다.
// 값을 키우면 빠르게 끌려 올라가고, 낮추면 천천히 따라 올라갑니다.
// 마지막 지점 클릭 후 수면 쪽으로 끌려 올라오는 전체 연출 시간입니다.
// 깊은 곳에서 빠져나오는 느낌을 유지하려고 최소 5초 이상으로 잡았습니다.
const RESTORE_DURATION_MS = 5000; // 클릭 복귀 전체 시간(ms). 크게 하면 더 깊은 곳에서 천천히 끌려 올라옵니다.
const BUBBLE_COUNT = 86;
const BUBBLE_FAR_Z = -92;
const BUBBLE_NEAR_Z = 5;
const ACTIVE_GENERATION = "YB";

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

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function revealBetween(progress, start, fullyVisible, end) {
  const fadeIn = smoothstep(start, fullyVisible, progress);
  const fadeOut = 1 - smoothstep(fullyVisible, end, progress);
  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

function revealWithHold(progress, start, fullyVisible, holdEnd, end) {
  const fadeIn = smoothstep(start, fullyVisible, progress);
  const fadeOut = 1 - smoothstep(holdEnd, end, progress);
  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function randomRange(seed, min, max) {
  return min + seededRandom(seed) * (max - min);
}

function buildHeadlineItems(data, generation) {
  const filtered = data.filter((item) => item.generation === generation).slice(0, 10);

  return filtered.map((item, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const orderOnSide = Math.floor(index / 2);
    const focus = 0.06 + index * 0.078;
    const isLate = index >= 8;
    const xBase = isLate ? 680 : 700 + orderOnSide * 34;
    const x = side === -1
      ? `clamp(-${xBase}px, -${40 + orderOnSide * 2}vw, -300px)`
      : `clamp(300px, ${40 + orderOnSide * 2}vw, ${xBase}px)`;
    const y = ((index % 5) - 2) * 32;
    const z = -(focus * DEPTH + 980);

    return {
      ...item,
      id: `${generation}-${index}-${item.link}`,
      index,
      label: String(index + 1).padStart(2, "0"),
      side: side === -1 ? "left" : "right",
      style: {
        "--headline-x": x,
        "--headline-y": `${y}px`,
        "--headline-z": `${z}px`,
        "--headline-rotate": `${side === -1 ? 14 : -14}deg`,
      },
      revealStart: focus - 0.026,
      revealFull: focus - 0.004,
      revealHold: focus + 0.032,
      revealEnd: focus + 0.058,
    };
  });
}

function buildDepthItems() {
  return Array.from({ length: 72 }, (_, index) => {
    const lane = index % 6;
    const side = lane < 3 ? -1 : 1;
    const distance = -260 - index * 108;
    const x = side * (90 + (lane % 3) * 170);
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
      scrollDelta * 4 + // drei ScrollControls 감도입니다. 올리면 내부 스크롤 반응이 더 강해집니다.
        virtualVelocity * 48 + // 실제 화면 진행 속도 감도입니다. 올리면 스크롤 중 기포가 더 쉽게 나옵니다.
        wheelInput * 2.8 + // 휠/터치 입력 감도입니다. 느린 스크롤에도 기포를 보이게 하려면 이 값을 올리세요.
        pointerMotion * 0.32, // 마우스 움직임 감도입니다. 올리면 마우스만 움직여도 기포 반응이 커집니다.
      0,
      1,
    );

    // inputPower가 0.015 아래면 거의 반응하지 않고, 0.16 이상이면 충분히 보입니다.
    // 더 빨리 나오게 하려면 0.015/0.16을 낮추고, 더 늦게 나오게 하려면 높이면 됩니다.
    const targetEnergy = smoothstep(0.03, 0.3, inputPower); // 앞 숫자는 발생 시작점, 뒤 숫자는 최대치 도달점입니다. 둘 다 낮추면 더 쉽게 보입니다.

    // 물방울이 바로 번쩍 켜지지 않게 지연시키는 값입니다.
    // 0.035는 켜질 때 속도, 0.018은 사라질 때 속도입니다. 값을 키우면 반응이 빨라집니다.
    const energyLerp = targetEnergy > bubbleEnergyRef.current ? 0.075 : 0.03; // 왼쪽은 기포가 켜지는 속도, 오른쪽은 사라지는 속도입니다.
    bubbleEnergyRef.current = lerp(
      bubbleEnergyRef.current,
      targetEnergy,
      energyLerp,
    );

    // 실제 화면에 보이는 정도입니다.
    // 0.025 아래에서는 숨고, 0.28 이상이면 거의 완전히 보입니다.
    const visibility = smoothstep(0.025, 0.28, bubbleEnergyRef.current); // 기포 투명도 범위입니다. 낮추면 더 빨리/오래 보입니다.

    // 기포가 Z축 깊은 곳에서 카메라 쪽으로 올라오는 속도입니다.
    // 0.035는 기본 속도, 0.62는 입력이 강할 때 추가되는 가속량입니다.
    const zAcceleration = 0.035 + bubbleEnergyRef.current * 0.62; // 앞 숫자는 기본 상승 속도, 뒤 숫자는 입력 시 추가 가속입니다.

    mesh.visible = visibility > 0.01;
    if (!mesh.visible) return;

    group.rotation.y = lerp(group.rotation.y, mouse.x * 0.18, 0.045); // 마우스 좌우 시선에 따른 기포 회전 강도/따라오는 속도입니다.
    group.rotation.x = lerp(group.rotation.x, -mouse.y * 0.12, 0.045); // 마우스 상하 시선에 따른 기포 회전 강도/따라오는 속도입니다.
    group.position.x = lerp(group.position.x, mouse.x * 0.55, 0.05); // 마우스 좌우 이동에 따른 기포층 밀림 강도/속도입니다.
    group.position.y = lerp(group.position.y, mouse.y * 0.36, 0.05); // 마우스 상하 이동에 따른 기포층 밀림 강도/속도입니다.

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
      const scale = bubble.radius * (0.42 + proximity * 4.4) * visibility; // 가까워질수록 커지는 정도입니다. 4.4를 올리면 카메라 앞 기포가 더 커집니다.

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
  const desiredLookRef = useRef({ x: 0, y: 0 });
  const targetProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const scrollInputRef = useRef(0);
  const pendingWheelDeltaRef = useRef(0);
  const pendingTouchDeltaRef = useRef(0);
  const lookLockUntilRef = useRef(0);
  const pointerMotionRef = useRef(0);
  const isRestoringRef = useRef(false);
  const restoreStartRef = useRef(0);
  const restoreFromRef = useRef(0);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [motionFx, setMotionFx] = useState({ drag: 0, restore: 0 });
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [generation] = useState(ACTIVE_GENERATION);
  const destinationActive = scrollProgress > 0.955;

  const depthItems = useMemo(buildDepthItems, []);
  const rings = useMemo(buildRings, []);
  const headlineItems = useMemo(
    () => buildHeadlineItems(headlineData, generation),
    [generation],
  );

  const addProgress = useCallback((delta) => {
    if (Math.abs(delta) > 0.0001) {
      // 스크롤 중에는 시선을 중앙으로 회수합니다. 옆을 본 상태로 내려가면 깊이 방향이 흐트러집니다.
      desiredLookRef.current = { x: 0, y: 0 };
      pointerPointRef.current = null;
      lookLockUntilRef.current = performance.now() + 900;
    }

    targetProgressRef.current = clamp(targetProgressRef.current + delta, 0, 1);
    scrollInputRef.current = clamp(
      scrollInputRef.current + Math.abs(delta) * 44, // 스크롤 입력 누적 감도입니다. 올리면 느린 스크롤에도 물방울/저항감이 잘 반응합니다.
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
      desiredLookRef.current = { x: 0, y: 0 };
      pointerPointRef.current = null;
      pendingWheelDeltaRef.current = clamp(
        pendingWheelDeltaRef.current + event.deltaY / 26000, // 휠 스크롤 감도입니다. 숫자를 키우면 더 천천히 내려갑니다.
        -0.12,
        0.12,
      );
    };

    const handleTouchStart = (event) => {
      if (event.target.closest("button")) {
        touchStartRef.current = null;
        pendingTouchDeltaRef.current = 0;
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
      desiredLookRef.current = { x: 0, y: 0 };
      pointerPointRef.current = null;
      pendingTouchDeltaRef.current = clamp(
        pendingTouchDeltaRef.current + delta / 8200, // 모바일 터치 스크롤 감도입니다. 숫자를 키우면 더 천천히 내려갑니다.
        -0.08,
        0.08,
      );
    };

    const handleKeyDown = (event) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        desiredLookRef.current = { x: 0, y: 0 };
        pendingWheelDeltaRef.current = clamp(pendingWheelDeltaRef.current + 0.035, -0.12, 0.12);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        desiredLookRef.current = { x: 0, y: 0 };
        pendingWheelDeltaRef.current = clamp(pendingWheelDeltaRef.current - 0.035, -0.12, 0.12);
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
    const tick = (now = performance.now()) => {
      pointerMotionRef.current = lerp(pointerMotionRef.current, 0, 0.045); // 마우스 움직임 잔상 감소 속도입니다. 낮추면 물 저항감이 오래 남습니다.
      scrollInputRef.current = lerp(scrollInputRef.current, 0, 0.055); // 스크롤 입력 잔상 감소 속도입니다. 낮추면 기포/왜곡 반응이 오래 남습니다.

      if (Math.abs(pendingWheelDeltaRef.current) > 0.00001) {
        const wheelStep = pendingWheelDeltaRef.current * 0.105; // 휠/키보드 관성값입니다. 낮추면 멈춘 뒤 더 천천히 가라앉습니다.
        pendingWheelDeltaRef.current -= wheelStep;
        addProgress(wheelStep);
      }

      if (Math.abs(pendingTouchDeltaRef.current) > 0.00001) {
        const touchStep = pendingTouchDeltaRef.current * 0.105; // 터치 스크롤 지연값입니다. 낮추면 손가락 입력이 더 천천히 반영됩니다.
        pendingTouchDeltaRef.current -= touchStep;
        addProgress(touchStep);
      }

      if (
        targetProgressRef.current > 0.9 ||
        Math.abs(pendingWheelDeltaRef.current) > 0.0001 ||
        Math.abs(pendingTouchDeltaRef.current) > 0.0001 ||
        now < lookLockUntilRef.current
      ) {
        desiredLookRef.current = { x: 0, y: 0 };
      }

      targetLookRef.current = {
        x: lerp(targetLookRef.current.x, desiredLookRef.current.x, LOOK_TARGET_FOLLOW),
        y: lerp(targetLookRef.current.y, desiredLookRef.current.y, LOOK_TARGET_FOLLOW),
      };

      setLook((current) => {
        const next = {
          x: lerp(current.x, targetLookRef.current.x, LOOK_RENDER_FOLLOW), // 시선 좌우가 목표 시선을 따라가는 속도입니다.
          y: lerp(current.y, targetLookRef.current.y, LOOK_RENDER_FOLLOW), // 시선 상하가 목표 시선을 따라가는 속도입니다.
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
        if (isRestoringRef.current) {
          if (!restoreStartRef.current) {
            restoreStartRef.current = now;
            restoreFromRef.current = current;
          }

          const restoreProgress = clamp(
            (now - restoreStartRef.current) / RESTORE_DURATION_MS,
            0,
            1,
          );
          const easedRestore = easeInOutCubic(restoreProgress); // 복귀 가속 곡선입니다. 초반 느림, 중간 빠름, 마지막 감속 형태입니다.
          const next = lerp(restoreFromRef.current, 0, easedRestore);

          scrollVelocityRef.current = lerp(
            scrollVelocityRef.current,
            Math.abs(next - current),
            0.24, // 복귀 중 속도값이 따라오는 정도입니다. 올리면 기포/왜곡이 복귀 속도에 더 민감합니다.
          );

          if (restoreProgress >= 1) {
            isRestoringRef.current = false;
            restoreStartRef.current = 0;
            restoreFromRef.current = 0;
            scrollVelocityRef.current = lerp(scrollVelocityRef.current, 0, 0.22); // 복귀 종료 후 잔여 속도 정리 속도입니다.
            return 0;
          }

          return next;
        }

        const speed = 0.043; // 일반 스크롤 진행 보간 속도입니다. 낮추면 더 묵직하고, 높이면 더 즉각적입니다.
        const next = lerp(current, targetProgressRef.current, speed);
        scrollVelocityRef.current = lerp(
          scrollVelocityRef.current,
          Math.abs(next - current),
          0.32, // 일반 스크롤 속도값 반영 속도입니다. 올리면 물방울 반응이 더 즉각적입니다.
        );

        if (Math.abs(next - current) < 0.0005) {
          if (targetProgressRef.current === 0) {
            isRestoringRef.current = false;
          }

          scrollVelocityRef.current = lerp(scrollVelocityRef.current, 0, 0.22); // 멈췄을 때 속도값이 사라지는 속도입니다.
          return targetProgressRef.current;
        }

        return next;
      });

      const restoreProgress = restoreStartRef.current
        ? clamp((now - restoreStartRef.current) / RESTORE_DURATION_MS, 0, 1)
        : 0;
      const restorePull = isRestoringRef.current
        ? clamp(Math.sin(restoreProgress * Math.PI) * 0.88 + (1 - restoreProgress) * 0.18, 0, 1) // 클릭 복귀 연출 강도입니다. 0.88은 중간 상승 압력, 0.18은 초반 당김입니다.
        : 0;
      const waterDrag = clamp(
        pointerMotionRef.current * 0.82 + // 마우스 움직임이 물 저항감에 주는 비중입니다.
          scrollInputRef.current * 0.5 + // 휠/터치 입력이 물 저항감에 주는 비중입니다.
          scrollVelocityRef.current * 42, // 실제 진행 속도가 물 저항감에 주는 비중입니다.
        0,
        1,
      );

      setMotionFx((current) => {
        const next = {
          drag: lerp(current.drag, waterDrag, 0.1), // 물 저항 효과가 목표값을 따라가는 속도입니다. 낮추면 더 묵직하게 따라옵니다.
          restore: lerp(current.restore, restorePull, restorePull > current.restore ? 0.18 : 0.06), // 복귀 효과가 켜질 때/꺼질 때 따라가는 속도입니다.
        };

        if (
          Math.abs(next.drag - current.drag) < 0.004 &&
          Math.abs(next.restore - current.restore) < 0.004
        ) {
          return current;
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

      desiredLookRef.current = {
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
      look: { ...desiredLookRef.current },
    };
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (performance.now() < lookLockUntilRef.current || targetProgressRef.current > 0.9) {
      desiredLookRef.current = { x: 0, y: 0 };
      pointerPointRef.current = null;
      return;
    }

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

      desiredLookRef.current = {
        x: clamp(offsetX * -90, -DRAG_LIMIT, DRAG_LIMIT), // offsetX는 -0.5~0.5라서 90을 곱하면 좌우 최대 45도가 됩니다.
        y: clamp(offsetY * -64, -36, 36), // 위아래 시야 범위입니다. 너무 어지러우면 36을 낮추면 됩니다.
      };
      return;
    }

    if (!dragStartRef.current) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    desiredLookRef.current = {
      x: clamp(
        dragStartRef.current.look.x - deltaX * 0.12,
        -DRAG_LIMIT,
        DRAG_LIMIT,
      ),
      y: clamp(dragStartRef.current.look.y - deltaY * 0.1, -36, 36),
    };
  };

  const handlePointerUp = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      pointerPointRef.current = null;
      if (!gyroEnabled) {
        desiredLookRef.current = { x: 0, y: 0 };
      }
    }
  };

  const handleRestoreScroll = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    desiredLookRef.current = { x: 0, y: 0 };
    isRestoringRef.current = true;
    restoreStartRef.current = performance.now();
    restoreFromRef.current = scrollProgress;
    targetProgressRef.current = 0;
    scrollInputRef.current = 1; // 클릭 순간 스크롤 입력 반응을 강제로 한 번 올립니다. 낮추면 복귀 시작 기포가 약해집니다.
    pointerMotionRef.current = 0.8; // 클릭 순간 물 흔들림을 강제로 한 번 줍니다. 낮추면 시작 충격이 약해집니다.
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const cameraZ = scrollProgress * DEPTH;
  const stageStyle = {
    "--camera-z": `${cameraZ}px`,
    "--look-x": `${look.x}deg`,
    "--look-y": `${look.y}deg`,
    "--progress": scrollProgress,
    "--water-drag": motionFx.drag,
    "--restore-pull": motionFx.restore,
  };
  const viewportStyle = {
    "--progress": scrollProgress,
    "--water-drag": motionFx.drag,
    "--restore-pull": motionFx.restore,
  };
  const destinationStyle = { "--reveal": smoothstep(0.86, 0.975, scrollProgress) };

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

        <div
          className="scroll3d__abyss-light"
          style={destinationStyle}
          data-active={destinationActive}
          aria-hidden
        >
          <span />
        </div>

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

            {headlineItems.map((headline) => (
              <article
                className={`scroll3d__headline scroll3d__headline--${headline.side}`}
                key={headline.id}
                style={{
                  ...headline.style,
                  "--reveal": revealWithHold(
                    scrollProgress,
                    headline.revealStart,
                    headline.revealFull,
                    headline.revealHold,
                    headline.revealEnd,
                  ),
                }}
              >
                <strong>{headline.title}</strong>
              </article>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}

export default Scrolling;
