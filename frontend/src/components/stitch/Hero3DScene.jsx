import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Procedural Seafloor Terrain with Bathymetric Color Shading
// ----------------------------------------------------------------------------
function SeafloorTerrain({ sweepAngleRef, onSweepHit }) {
  const meshRef = useRef();

  const { geometry, originalPositions } = useMemo(() => {
    const width = 32;
    const depth = 32;
    const segments = 48;
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const count = pos.count;
    const orig = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Procedural bathymetric terrain: trench + gentle ripples + continental slope
      const trench = -Math.exp(-Math.pow(x - 3.5, 2) / 18) * 3.2;
      const ridge = Math.sin(x * 0.4) * Math.cos(z * 0.35) * 1.4;
      const sandRipples = Math.sin(x * 1.4 + z * 0.9) * 0.28 + Math.cos(x * 0.8 - z * 1.2) * 0.15;
      const slope = -z * 0.08;
      const y = trench + ridge + sandRipples + slope - 1.2;

      pos.setY(i, y);
      orig[i * 3 + 0] = x;
      orig[i * 3 + 1] = y;
      orig[i * 3 + 2] = z;

      // Base abyssal bathymetric depth gradient: #020e21 (deep) -> #0e2b47 (shallows)
      const normY = (y + 4.5) / 5.5; // normalized 0 to 1
      colors[i * 3 + 0] = 0.02 + normY * 0.06; // R
      colors[i * 3 + 1] = 0.08 + normY * 0.22; // G
      colors[i * 3 + 2] = 0.16 + normY * 0.35; // B
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo, originalPositions: orig };
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.78}
        metalness={0.12}
        wireframe={false}
      />
    </mesh>
  );
}

// ----------------------------------------------------------------------------
// Procedural Rocks Scattered on the Seabed
// ----------------------------------------------------------------------------
function SeabedRocks() {
  const rocksData = useMemo(() => [
    { pos: [-5.2, -1.8, -4.1], scale: [0.8, 0.6, 0.9], rot: [0.3, 0.5, 0.2] },
    { pos: [6.1, -1.5, 3.8], scale: [1.1, 0.7, 1.0], rot: [0.1, 1.2, 0.4] },
    { pos: [-2.8, -1.9, -6.5], scale: [0.6, 0.5, 0.7], rot: [0.4, 0.2, 0.8] },
    { pos: [1.5, -2.4, 5.2], scale: [0.9, 0.5, 0.8], rot: [0.7, 0.9, 0.1] },
    { pos: [4.8, -2.1, -5.6], scale: [0.7, 0.6, 0.6], rot: [0.2, 0.6, 0.5] },
  ], []);

  return (
    <group>
      {rocksData.map((rock, idx) => (
        <mesh key={idx} position={rock.pos} scale={rock.scale} rotation={rock.rot} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#1d2a3e"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Rotating Circular Sonar Sweep Beam with Light Cascade
// ----------------------------------------------------------------------------
function SonarSweepBeam({ sweepAngleRef }) {
  const sweepMeshRef = useRef();
  const lightRef = useRef();

  useFrame((_, delta) => {
    // Angular rotation: approx 0.8 rad/sec
    sweepAngleRef.current = (sweepAngleRef.current + delta * 0.85) % (Math.PI * 2);

    if (sweepMeshRef.current) {
      sweepMeshRef.current.rotation.y = sweepAngleRef.current;
    }

    if (lightRef.current) {
      const radius = 7.5;
      lightRef.current.position.x = Math.cos(sweepAngleRef.current) * radius;
      lightRef.current.position.z = Math.sin(sweepAngleRef.current) * radius;
    }
  });

  // Create a fan-shaped circular sector for the sweep line & trailing phosphor fade
  const sectorGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const radius = 14;
    const arcAngle = Math.PI * 0.22; // ~40 degree sector
    shape.moveTo(0, 0);
    for (let a = 0; a <= arcAngle; a += arcAngle / 20) {
      shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <group position={[0, -0.6, 0]}>
      {/* Rotating Sweep Sector */}
      <mesh ref={sweepMeshRef} geometry={sectorGeometry}>
        <meshBasicMaterial
          color="#00f2fe"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sweep Reticle Ring Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.8, 14.0, 64]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.8, 8.0, 48]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sweeping Point Light */}
      <pointLight
        ref={lightRef}
        position={[5, 2, 5]}
        color="#00f2fe"
        intensity={3.5}
        distance={18}
        decay={1.8}
      />
    </group>
  );
}

// ----------------------------------------------------------------------------
// Target 1: Derelict Ghost Net with Dynamic Bounding Box & HUD Tag
// ----------------------------------------------------------------------------
function GhostNetTarget({ position = [-4.0, -1.8, 2.8], sweepAngleRef }) {
  const [highlight, setHighlight] = useState(0);
  const meshRef = useRef();

  // Angular position from center
  const targetAngle = useMemo(() => {
    let a = Math.atan2(position[2], position[0]);
    if (a < 0) a += Math.PI * 2;
    return a;
  }, [position]);

  useFrame((_, delta) => {
    const curSweep = sweepAngleRef.current;
    let diff = Math.abs(curSweep - targetAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    // Trigger hit when sweep passes within 0.24 rad
    if (diff < 0.24) {
      setHighlight(1.0);
    } else {
      // Exponential phosphor decay
      setHighlight((prev) => Math.max(0, prev - delta * 0.65));
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Ghost net mesh: layered organic torus knots with wireframe look */}
      <mesh ref={meshRef} scale={[0.85, 0.6, 0.85]}>
        <torusKnotGeometry args={[0.9, 0.32, 64, 16, 2, 5]} />
        <meshStandardMaterial
          color={highlight > 0.1 ? '#00f2fe' : '#14b8a6'}
          emissive={highlight > 0.1 ? '#00f2fe' : '#04b4a2'}
          emissiveIntensity={highlight * 1.8 + 0.15}
          wireframe={true}
          roughness={0.4}
        />
      </mesh>

      {/* Bounding Box Reticle when illuminated */}
      {highlight > 0.05 && (
        <group>
          {/* Wireframe Bounding Box */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(2.4, 2.0, 2.4)]} />
            <lineBasicMaterial
              color="#00f2fe"
              transparent
              opacity={Math.min(1, highlight * 1.4)}
              linewidth={1.5}
            />
          </lineSegments>

          {/* HTML HUD Label & Confidence Tag */}
          <Html position={[0, 1.4, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
            <div
              className="pointer-events-none select-none flex flex-col items-center gap-0.5 transition-opacity duration-200"
              style={{ opacity: Math.min(1, highlight * 1.5) }}
            >
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/90 border border-primary-container shadow-[0_0_12px_rgba(0,242,254,0.4)] backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping" />
                <span className="font-label-badge text-label-badge text-primary font-bold uppercase tracking-wider">
                  Net 87%
                </span>
                <span className="font-label-coord text-label-coord text-secondary">
                  -428m
                </span>
              </div>
              <span className="font-label-coord text-[9px] text-on-surface-variant bg-surface-container-high/90 px-1 py-0.5 rounded">
                POLY-SYNTHETIC WEAVE
              </span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Target 2: Sunken Industrial Pipe / Wreck Fragment
// ----------------------------------------------------------------------------
function PipeWreckTarget({ position = [4.2, -2.1, -2.6], sweepAngleRef }) {
  const [highlight, setHighlight] = useState(0);

  const targetAngle = useMemo(() => {
    let a = Math.atan2(position[2], position[0]);
    if (a < 0) a += Math.PI * 2;
    return a;
  }, [position]);

  useFrame((_, delta) => {
    const curSweep = sweepAngleRef.current;
    let diff = Math.abs(curSweep - targetAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    if (diff < 0.24) {
      setHighlight(1.0);
    } else {
      setHighlight((prev) => Math.max(0, prev - delta * 0.65));
    }
  });

  return (
    <group position={position} rotation={[0.15, 0.45, -0.2]}>
      {/* Cylindrical pipeline section half-buried in seabed */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 3.2, 24]} />
        <meshStandardMaterial
          color={highlight > 0.1 ? '#4fdbc8' : '#28354a'}
          emissive={highlight > 0.1 ? '#04b4a2' : '#061426'}
          emissiveIntensity={highlight * 1.5 + 0.1}
          roughness={0.65}
          metalness={0.7}
        />
      </mesh>

      {/* Flange collar */}
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.25, 24]} />
        <meshStandardMaterial
          color="#3a494b"
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>

      {/* Bounding Box Reticle & Label */}
      {highlight > 0.05 && (
        <group>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(3.6, 1.2, 1.4)]} />
            <lineBasicMaterial
              color="#4fdbc8"
              transparent
              opacity={Math.min(1, highlight * 1.4)}
              linewidth={1.5}
            />
          </lineSegments>

          <Html position={[0, 1.2, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
            <div
              className="pointer-events-none select-none flex flex-col items-center gap-0.5 transition-opacity duration-200"
              style={{ opacity: Math.min(1, highlight * 1.5) }}
            >
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/90 border border-secondary shadow-[0_0_12px_rgba(79,219,200,0.35)] backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="font-label-badge text-label-badge text-primary font-bold uppercase tracking-wider">
                  Pipe 94%
                </span>
                <span className="font-label-coord text-label-coord text-secondary">
                  -435m
                </span>
              </div>
              <span className="font-label-coord text-[9px] text-on-surface-variant bg-surface-container-high/90 px-1 py-0.5 rounded">
                METALLIC CONDUIT (3.2m)
              </span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Camera Controller: Drift, Mouse Parallax, and Scroll Progression
// ----------------------------------------------------------------------------
function SceneCamera({ scrollProgress = 0 }) {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Base position
    const baseX = 0;
    const baseY = 11.5;
    const baseZ = 16.5;

    // Camera drift + Mouse Parallax + Scroll elevation shift
    const targetX = baseX + Math.sin(time * 0.25) * 0.8 + mouseRef.current.x * 1.8;
    const targetY = baseY + Math.cos(time * 0.2) * 0.4 - mouseRef.current.y * 1.2 - scrollProgress * 3.5;
    const targetZ = baseZ + Math.sin(time * 0.15) * 0.5 - scrollProgress * 2.0;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 2.5);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 2.5);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, delta * 2.5);

    camera.lookAt(0, -1.8, 0);
  });

  return null;
}

// ----------------------------------------------------------------------------
// Static Fallback Image for Reduced Motion
// ----------------------------------------------------------------------------
export function StaticSonarFallback() {
  return (
    <div className="relative w-full h-full min-h-[320px] rounded-xl bg-surface-container-lowest overflow-hidden flex items-center justify-center p-space-md border border-outline-variant/30">
      {/* Background Sonar Radar Graphic */}
      <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <radialGradient cx="50%" cy="50%" id="fallbackGlow" r="50%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.25" />
          <stop offset="65%" stopColor="#04b4a2" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#061426" stopOpacity="0" />
        </radialGradient>
        <rect fill="url(#fallbackGlow)" height="100%" width="100%" />
        <circle cx="50%" cy="50%" fill="none" opacity="0.4" r="50" stroke="#4fdbc8" strokeDasharray="3,3" strokeWidth="1" />
        <circle cx="50%" cy="50%" fill="none" opacity="0.3" r="100" stroke="#4fdbc8" strokeDasharray="4,4" strokeWidth="1" />
        <circle cx="50%" cy="50%" fill="none" opacity="0.2" r="150" stroke="#4fdbc8" strokeWidth="1" />
        <line opacity="0.4" stroke="#849495" strokeWidth="1" x1="0" x2="100%" y1="50%" y2="50%" />
        <line opacity="0.4" stroke="#849495" strokeWidth="1" x1="50%" x2="50%" y1="0" y2="100%" />
        <line opacity="0.8" stroke="#00f2fe" strokeWidth="2" x1="50%" x2="80%" y1="50%" y2="20%" />
      </svg>

      {/* Target Badges */}
      <div className="relative z-10 flex flex-col gap-space-sm items-center">
        <div className="px-3 py-1.5 rounded-lg bg-surface-container-high/90 border border-primary-container shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="font-label-badge text-label-badge text-primary uppercase font-bold">
            Target Acquired: Net 87%
          </span>
          <span className="font-label-coord text-label-coord text-secondary">-428m</span>
        </div>
        <div className="px-3 py-1 rounded bg-surface-container-lowest/80 border border-outline-variant font-label-coord text-label-coord text-on-surface-variant">
          455 kHz Acoustic Bathymetry • Static Mode
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Exported Hero3DScene Component with Lazy & Accessibility Support
// ----------------------------------------------------------------------------
export default function Hero3DScene({ scrollProgress = 0 }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const sweepAngleRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (prefersReducedMotion) {
    return <StaticSonarFallback />;
  }

  return (
    <div className="relative w-full h-full min-h-[340px] sm:min-h-[420px] lg:min-h-[520px] rounded-xl overflow-hidden bg-surface-container-lowest">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 11.5, 16.5], fov: 48, near: 0.1, far: 80 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={['#020e21']} />
        <fogExp2 attach="fog" args={['#020e21', 0.024]} />

        {/* Tactical Lighting */}
        <ambientLight intensity={0.8} color="#0c3150" />
        <directionalLight
          position={[8, 18, 10]}
          intensity={2.2}
          color="#00f2fe"
          castShadow
        />
        <pointLight position={[-6, 6, -4]} intensity={1.2} color="#14b8a6" />

        {/* Seafloor Elements */}
        <SeafloorTerrain sweepAngleRef={sweepAngleRef} />
        <SeabedRocks />

        {/* Rotating Sonar Sweep */}
        <SonarSweepBeam sweepAngleRef={sweepAngleRef} />

        {/* Detectable Targets */}
        <GhostNetTarget position={[-4.0, -1.8, 2.8]} sweepAngleRef={sweepAngleRef} />
        <PipeWreckTarget position={[4.2, -2.1, -2.6]} sweepAngleRef={sweepAngleRef} />

        {/* Dynamic Camera Control */}
        <SceneCamera scrollProgress={scrollProgress} />
      </Canvas>

      {/* Floating Tactical Coordinate Badges (from Stitch & DESIGN.md) */}
      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/40 flex items-center gap-1.5 shadow-sm">
        <span className="material-symbols-outlined text-secondary text-[16px]">radar</span>
        <span className="font-label-coord text-label-coord text-secondary font-bold tracking-wider">
          LIVE CHIRP SWEEP
        </span>
      </div>

      <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/40 font-label-coord text-label-coord text-primary-fixed-dim">
        BEARING: 042° TRUE
      </div>

      <div className="absolute bottom-3 left-3 z-10 px-2 py-1 rounded bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/40 font-label-telemetry text-label-telemetry text-secondary flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        <span>DEPTH: -428m</span>
      </div>

      <div className="absolute bottom-3 right-3 z-10 px-2 py-1 rounded bg-surface-container-lowest/85 backdrop-blur-md border border-outline-variant/40 font-label-telemetry text-label-telemetry text-on-surface-variant">
        455 kHz CHIRP
      </div>
    </div>
  );
}
