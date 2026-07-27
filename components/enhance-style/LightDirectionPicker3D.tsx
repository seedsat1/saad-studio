"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Grid, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type LightDirection = "front" | "side" | "bottom" | "top-down";

interface Props {
  value: LightDirection;
  onChange: (dir: LightDirection) => void;
  imageUrl?: string | null;
  isAr?: boolean;
}

function directionToPos(d: LightDirection): [number, number, number] {
  switch (d) {
    case "front":    return [0,    0.7, 2.2];
    case "side":     return [2.2,  0.7, 0.6];
    case "bottom":   return [0,   -1.0, 1.2];
    case "top-down": return [0,    2.4, 1.2];
  }
}

function posToDirection([x, y, z]: [number, number, number]): LightDirection {
  const distXY = Math.hypot(x, y);
  if (distXY < 0.9 && z > 1.4) return "front";
  if (Math.abs(y) > Math.abs(x)) return y > 0.5 ? "top-down" : y < -0.5 ? "bottom" : "front";
  return "side";
}

// ── Draggable spotlight ──────────────────────────────────────────
function DraggableLight({
  position, onDrag, onDrop,
}: {
  position: [number, number, number];
  onDrag: (p: [number, number, number]) => void;
  onDrop: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const targetHelper = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (!dragging) return;
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const plane = e.shiftKey
        ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -position[1])
        : new THREE.Plane(new THREE.Vector3(0, 0, 1), -position[2]);
      const found = raycaster.ray.intersectPlane(plane, hit);
      if (found) {
        onDrag([
          Math.max(-2.6, Math.min(2.6, hit.x)),
          Math.max(-1.5, Math.min(2.8, hit.y)),
          Math.max(-0.3, Math.min(3.0, hit.z)),
        ]);
      }
    };
    const onUp = () => { setDragging(false); onDrop(); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, camera, gl, hit, ndc, position, raycaster, onDrag, onDrop]);

  // Rotate the fixture so its beam points at the image plane center
  const target = useMemo<[number, number, number]>(() => [0, 0.7, 0], []);
  const quat = useMemo(() => {
    const dir = new THREE.Vector3(target[0] - position[0], target[1] - position[1], target[2] - position[2]).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [position, target]);
  const dist = Math.hypot(target[0] - position[0], target[1] - position[1], target[2] - position[2]);
  const beamLen = Math.max(0.2, dist - 0.3);
  const coneOuterRadius = Math.max(0.14, dist * 0.14);

  return (
    <>
      <object3D ref={targetHelper} position={target} />

      <group position={position}>
        {/* Housing rotated to face target */}
        <group quaternion={quat}>
          {/* Metallic barrel */}
          <mesh
            position={[0, 0.06, 0]}
            onPointerDown={(e) => { e.stopPropagation(); setDragging(true); }}
            onPointerOver={() => { document.body.style.cursor = "grab"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}
          >
            <cylinderGeometry args={[0.08, 0.11, 0.16, 20]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Glowing front rim */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.02, 20]} />
            <meshBasicMaterial color="#fde68a" toneMapped={false} />
          </mesh>
          {/* Beam — soft translucent cone */}
          <mesh position={[0, 0.16 + beamLen / 2, 0]}>
            <coneGeometry args={[coneOuterRadius, beamLen, 32, 1, true]} />
            <meshBasicMaterial
              color="#fff2c9"
              transparent
              opacity={dragging ? 0.18 : 0.10}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        {/* Small halo glow */}
        <mesh>
          <sphereGeometry args={[0.20, 16, 16]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.16} depthWrite={false} />
        </mesh>

        <spotLight
          intensity={dragging ? 5 : 3.5}
          distance={12}
          angle={Math.PI / 7}
          penumbra={0.5}
          decay={2}
          color="#fff2c9"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          target={targetHelper.current || undefined}
        />
      </group>
    </>
  );
}

// ── Image plane ──────────────────────────────────────────────────
function ImagePlane({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <group position={[0, 0.7, 0]}>
      {/* Frame back */}
      <mesh position={[0, 0, -0.02]} castShadow receiveShadow>
        <planeGeometry args={[1.7, 2.1]} />
        <meshStandardMaterial color="#0d1421" roughness={0.6} />
      </mesh>
      {imageUrl ? (
        <Suspense fallback={<PlaceholderPlane />}>
          <TexturedPlane url={imageUrl} />
        </Suspense>
      ) : (
        <PlaceholderPlane />
      )}
    </group>
  );
}

function TexturedPlane({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  useEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; }, [texture]);
  return (
    <mesh receiveShadow>
      <planeGeometry args={[1.55, 1.95]} />
      <meshStandardMaterial map={texture} roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

function PlaceholderPlane() {
  return (
    <mesh receiveShadow>
      <planeGeometry args={[1.55, 1.95]} />
      <meshStandardMaterial color="#1a2434" roughness={0.55} />
    </mesh>
  );
}

// ── Camera pointer helper ────────────────────────────────────────
function LookAt({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => { camera.lookAt(target[0], target[1], target[2]); }, [camera, target]);
  return null;
}

// ── Main picker ─────────────────────────────────────────────────
export function LightDirectionPicker3D({ value, onChange, imageUrl, isAr = true }: Props) {
  const [pos, setPos] = useState<[number, number, number]>(() => directionToPos(value));
  useEffect(() => { setPos(directionToPos(value)); }, [value]);

  const handleDrop = () => {
    const snapped = posToDirection(pos);
    setPos(directionToPos(snapped));
    onChange(snapped);
  };

  const activeLabel = posToDirection(pos);
  const dirLabels: Record<LightDirection, string> = isAr
    ? { front: "أمامي", side: "جانبي", bottom: "من الأسفل", "top-down": "من الأعلى" }
    : { front: "Front", side: "Side", bottom: "Bottom", "top-down": "Top-Down" };

  return (
    <div className="flex flex-col items-center gap-3 select-none w-full">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
        {isAr ? "اتجاه الإضاءة — اسحب المصباح في المشهد" : "Light Direction — drag the bulb in the scene"}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 340,
          height: 280,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, #050912 0%, #01020a 100%)",
          position: "relative",
        }}
      >
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <PerspectiveCamera makeDefault position={[3.0, 1.6, 4.2]} fov={35} />
          <LookAt target={[0, 0.5, 0]} />

          <ambientLight intensity={0.22} />
          <hemisphereLight color="#2a3648" groundColor="#03050a" intensity={0.28} />

          <Grid
            position={[0, -0.5, 0]}
            args={[20, 20]}
            cellSize={0.35}
            cellColor="#1e2a3d"
            sectionSize={1.4}
            sectionColor="#334865"
            sectionThickness={1}
            fadeDistance={12}
            fadeStrength={1.5}
            infiniteGrid
          />

          {/* Ground shadow catcher */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial opacity={0.35} />
          </mesh>

          <ImagePlane imageUrl={imageUrl} />

          <DraggableLight position={pos} onDrag={setPos} onDrop={handleDrop} />

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
            target={[0, 0.5, 0]}
          />
        </Canvas>

        <div style={{
          position: "absolute", left: 8, bottom: 6,
          fontSize: 9, color: "#3d5573", fontWeight: 500,
          background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4,
          pointerEvents: "none", zIndex: 5,
        }}>
          {isAr ? "Shift + سحب = عمق" : "Shift + drag = depth"}
        </div>
      </div>

      {/* Snap direction chips */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {(["front", "side", "bottom", "top-down"] as LightDirection[]).map((dir) => {
          const active = dir === activeLabel;
          return (
            <button
              key={dir}
              type="button"
              onClick={() => { setPos(directionToPos(dir)); onChange(dir); }}
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "5px 10px", borderRadius: 8,
                background: active ? "rgba(253,230,138,0.14)" : "rgba(30,40,55,0.7)",
                color: active ? "#fde68a" : "#7c8ea3",
                border: `1px solid ${active ? "rgba(253,230,138,0.5)" : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer", transition: "all 0.14s",
                boxShadow: active ? "0 0 12px rgba(253,230,138,0.25)" : "none",
              }}
            >
              {dirLabels[dir]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span>
          {isAr ? "الحالي: " : "Current: "}
          <span className="text-amber-300 font-bold">{dirLabels[activeLabel]}</span>
        </span>
        {activeLabel !== "front" && (
          <button
            type="button"
            onClick={() => { setPos(directionToPos("front")); onChange("front"); }}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded px-2 py-0.5 transition-colors"
          >
            {isAr ? "↺ افتراضي" : "↺ Default"}
          </button>
        )}
      </div>
    </div>
  );
}
