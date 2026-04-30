import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, useScroll } from "@react-three/drei";
import * as THREE from "three";
import "./Scrolling.css";
import { Environment } from '@react-three/drei';
import headlineData from "./B_deta.json";

const DEPTH = 12800;
const DRAG_LIMIT = 45;
const LOOK_TARGET_FOLLOW = 0.07;
const LOOK_RENDER_FOLLOW = 0.04;

const RESTORE_DURATION_MS = 5000;
const BUBBLE_COUNT = 86;
const BUBBLE_FAR_Z = -92;
const BUBBLE_NEAR_Z = 5;
const POINTER_LOCK_RELEASE_MOTION = 8;
const RESTORE_EFFECT_DURATION_MS = 3000;
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

    const inputPower = clamp(
      scrollDelta * 4 +
        virtualVelocity * 48 +
        wheelInput * 2.8 +
        pointerMotion * 0.32,
      0,
      1,
    );

    const targetEnergy = smoothstep(0.03, 0.3, inputPower);

    const energyLerp = targetEnergy > bubbleEnergyRef.current ? 0.075 : 0.03;
    bubbleEnergyRef.current = lerp(
      bubbleEnergyRef.current,
      targetEnergy,
      energyLerp,
    );

    const visibility = smoothstep(0.025, 0.28, bubbleEnergyRef.current);

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
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
  color="#1a97c9"
  transparent={true}
  opacity={0.2}
  roughness={0}
  metalness={0.1}
  clearcoat={1}
  clearcoatRoughness={0}
  envMapIntensity={2}
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
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 3.2, 5]} intensity={4.6} color="#ffffff" />

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
  const restoreEffectTimeoutRef = useRef(0);

  const targetLookRef = useRef({ x: 0, y: 0 });
  const desiredLookRef = useRef({ x: 0, y: 0 });
  const latestPointerLookRef = useRef(null);
  const pointerLookOverrideRef = useRef(false);
  const targetProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const scrollInputRef = useRef(0);
  const pendingWheelDeltaRef = useRef(0);
  const pendingTouchDeltaRef = useRef(0);
  const lookLockUntilRef = useRef(0);
  const pointerMotionRef = useRef(0);
  const restoreProgressRef = useRef(0);
  const isRestoringRef = useRef(false);
  const restoreStartRef = useRef(0);
  const restoreFromRef = useRef(0);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [motionFx, setMotionFx] = useState({ drag: 0, restore: 0, idle: 1 });
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [generation] = useState(ACTIVE_GENERATION);
  const [restoreEffectKey, setRestoreEffectKey] = useState(0);
  const [restoreEffectActive, setRestoreEffectActive] = useState(false);
  const destinationActive = scrollProgress > 0.955;

  const depthItems = useMemo(buildDepthItems, []);
  const rings = useMemo(buildRings, []);
  const headlineItems = useMemo(
    () => buildHeadlineItems(headlineData, generation),
    [generation],
  );

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
    return () => window.clearTimeout(restoreEffectTimeoutRef.current);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      desiredLookRef.current = { x: 0, y: 0 };
      latestPointerLookRef.current = null;
      pointerLookOverrideRef.current = false;
      pointerPointRef.current = null;
      lookLockUntilRef.current = performance.now() + 900;
      pendingWheelDeltaRef.current = clamp(
        pendingWheelDeltaRef.current + event.deltaY / 26000,
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
      latestPointerLookRef.current = null;
      pointerLookOverrideRef.current = false;
      pointerPointRef.current = null;
      lookLockUntilRef.current = performance.now() + 900;
      pendingTouchDeltaRef.current = clamp(
        pendingTouchDeltaRef.current + delta / 8200,
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
        latestPointerLookRef.current = null;
        pointerLookOverrideRef.current = false;
        lookLockUntilRef.current = performance.now() + 900;
        pendingWheelDeltaRef.current = clamp(pendingWheelDeltaRef.current + 0.035, -0.12, 0.12);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        desiredLookRef.current = { x: 0, y: 0 };
        latestPointerLookRef.current = null;
        pointerLookOverrideRef.current = false;
        lookLockUntilRef.current = performance.now() + 900;
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
      pointerMotionRef.current = lerp(pointerMotionRef.current, 0, 0.045);
      scrollInputRef.current = lerp(scrollInputRef.current, 0, 0.055);

      if (Math.abs(pendingWheelDeltaRef.current) > 0.00001) {
        const wheelStep = pendingWheelDeltaRef.current * 0.105;
        pendingWheelDeltaRef.current -= wheelStep;
        addProgress(wheelStep);
      }

      if (Math.abs(pendingTouchDeltaRef.current) > 0.00001) {
        const touchStep = pendingTouchDeltaRef.current * 0.105;
        pendingTouchDeltaRef.current -= touchStep;
        addProgress(touchStep);
      }

      const shouldCenterLook =
        targetProgressRef.current > 0.9 ||
        (!pointerLookOverrideRef.current &&
          (Math.abs(pendingWheelDeltaRef.current) > 0.0001 ||
            Math.abs(pendingTouchDeltaRef.current) > 0.0001 ||
            now < lookLockUntilRef.current));

      if (shouldCenterLook) {
        desiredLookRef.current = { x: 0, y: 0 };
      } else if (latestPointerLookRef.current) {
        desiredLookRef.current = latestPointerLookRef.current;
      }

      targetLookRef.current = {
        x: lerp(targetLookRef.current.x, desiredLookRef.current.x, LOOK_TARGET_FOLLOW),
        y: lerp(targetLookRef.current.y, desiredLookRef.current.y, LOOK_TARGET_FOLLOW),
      };

      setLook((current) => {
        const next = {
          x: lerp(current.x, targetLookRef.current.x, LOOK_RENDER_FOLLOW),
          y: lerp(current.y, targetLookRef.current.y, LOOK_RENDER_FOLLOW),
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
          const easedRestore = easeInOutCubic(restoreProgress);
          const next = lerp(restoreFromRef.current, 0, easedRestore);

          scrollVelocityRef.current = lerp(
            scrollVelocityRef.current,
            Math.abs(next - current),
            0.24,
          );

          if (restoreProgress >= 1) {
            isRestoringRef.current = false;
            restoreStartRef.current = 0;
            restoreFromRef.current = 0;
            restoreProgressRef.current = 0;
            scrollVelocityRef.current = lerp(scrollVelocityRef.current, 0, 0.22);
            return 0;
          }

          return next;
        }

        const speed = 0.043;
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

      const restoreProgress = restoreStartRef.current
        ? clamp((now - restoreStartRef.current) / RESTORE_DURATION_MS, 0, 1)
        : 0;
      restoreProgressRef.current = isRestoringRef.current ? restoreProgress : 0;
      const restorePull = isRestoringRef.current
        ? clamp(Math.sin(restoreProgress * Math.PI) * 0.88 + (1 - restoreProgress) * 0.18, 0, 1)
        : 0;
      const waterDrag = clamp(
        pointerMotionRef.current * 0.82 +
          scrollInputRef.current * 0.5 +
          scrollVelocityRef.current * 42,
        0,
        1,
      );
      const isInputSettled =
        Math.abs(pendingWheelDeltaRef.current) < 0.00008 &&
        Math.abs(pendingTouchDeltaRef.current) < 0.00008 &&
        scrollInputRef.current < 0.04 &&
        scrollVelocityRef.current < 0.0008 &&
        !isRestoringRef.current;
      const idleWater = isInputSettled ? 1 : 0;

      setMotionFx((current) => {
        const next = {
          drag: lerp(current.drag, waterDrag, 0.1),
          restore: lerp(current.restore, restorePull, restorePull > current.restore ? 0.18 : 0.06),
          idle: lerp(current.idle, idleWater, idleWater > current.idle ? 0.035 : 0.16),
        };

        if (
          Math.abs(next.drag - current.drag) < 0.004 &&
          Math.abs(next.restore - current.restore) < 0.004 &&
          Math.abs(next.idle - current.idle) < 0.004
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

      const nextLook = {
        x: clamp(offsetX * -90, -DRAG_LIMIT, DRAG_LIMIT),
        y: clamp(offsetY * -64, -36, 36),
      };

      latestPointerLookRef.current = nextLook;

      if (motion > POINTER_LOCK_RELEASE_MOTION && targetProgressRef.current <= 0.9) {
        pointerLookOverrideRef.current = true;
        lookLockUntilRef.current = 0;
      }

      if (performance.now() < lookLockUntilRef.current || targetProgressRef.current > 0.9) {
        desiredLookRef.current = { x: 0, y: 0 };
        pointerPointRef.current = null;
        return;
      }

      desiredLookRef.current = nextLook;
      return;
    }

    if (performance.now() < lookLockUntilRef.current || targetProgressRef.current > 0.9) {
      desiredLookRef.current = { x: 0, y: 0 };
      pointerPointRef.current = null;
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
    setRestoreEffectKey((key) => key + 1);
    setRestoreEffectActive(true);
    window.clearTimeout(restoreEffectTimeoutRef.current);
    restoreEffectTimeoutRef.current = window.setTimeout(() => {
      setRestoreEffectActive(false);
    }, RESTORE_EFFECT_DURATION_MS);
    isRestoringRef.current = true;
    restoreStartRef.current = performance.now();
    restoreFromRef.current = scrollProgress;
    targetProgressRef.current = 0;
    scrollInputRef.current = 1;
    pointerMotionRef.current = 0.8;
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
    "--restore-progress": restoreProgressRef.current,
    "--idle-water": motionFx.idle,
  };
  const viewportStyle = {
    "--progress": scrollProgress,
    "--water-drag": motionFx.drag,
    "--restore-pull": motionFx.restore,
    "--restore-progress": restoreProgressRef.current,
    "--idle-water": motionFx.idle,
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

        <div className="scroll3d__idle-water" aria-hidden />

        <BubbleField
          scrollVelocityRef={scrollVelocityRef}
          scrollInputRef={scrollInputRef}
          pointerMotionRef={pointerMotionRef}
        />

        {restoreEffectActive && (
          <div className="scroll3d__restore-effect" aria-hidden>
            <img
              key={restoreEffectKey}
              src="/img/B/restore-suckit.webp"
              alt=""
            />
          </div>
        )}

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
                  "--flash": smoothstep(
                    headline.revealStart,
                    headline.revealFull,
                    scrollProgress,
                  ) * (1 - smoothstep(
                    headline.revealFull,
                    headline.revealFull + 0.035,
                    scrollProgress,
                  )),
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
