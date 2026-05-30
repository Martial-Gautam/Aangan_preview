'use client';

import { useMemo, useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

// ─── Progressive Spiral Layout ───────────────────────────────
// Photos start clustered together at the front of the sphere with uniform
// angular spacing.  As more photos are added they progressively spread
// outward to cover more of the sphere surface.

const SPHERE_RADIUS = 7;

interface SpherePoint {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Place `count` photos on the sphere using a Fibonacci spiral that starts
 * from the front-center (+Z axis) and expands outward.
 *
 * `maxTheta` controls how far the distribution reaches from the pole:
 *   - For 1–4 photos  → small cap  (≈30°–50°)
 *   - For ~20 photos  → hemisphere (90°)
 *   - For 50+ photos  → full sphere (170°)
 *
 * This keeps a small collection tight and uniform, while large collections
 * naturally fill the sphere.
 */
function fibonacciSphere(count: number, radius: number = SPHERE_RADIUS): SpherePoint[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: 0, y: 0, z: radius, rotation: 0 }];

  // Progressive cap angle: starts small, grows with count
  // lerp from ~35° (few photos) up to ~170° (many photos)
  const minCapDeg = 35;
  const maxCapDeg = 170;
  // Sigmoid-ish ramp: reaches ~90° around 15 photos, ~150° around 40
  const t = 1 - Math.exp(-count / 18);
  const capDeg = minCapDeg + (maxCapDeg - minCapDeg) * t;
  const maxTheta = (capDeg * Math.PI) / 180;

  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const points: SpherePoint[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute uniformly within the spherical cap [0, maxTheta]
    // Using equal-area spacing: cosθ ranges from 1 to cos(maxTheta)
    const cosMax = Math.cos(maxTheta);
    const cosTheta = 1 - (i / Math.max(count - 1, 1)) * (1 - cosMax);
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

    // Golden-angle azimuth for even spread
    const phi = GOLDEN_ANGLE * i;

    const sinTheta = Math.sin(theta);
    const x = sinTheta * Math.cos(phi) * radius;
    const y = sinTheta * Math.sin(phi) * radius;
    const z = cosTheta * radius;

    // Subtle, uniform rotation jitter (±6°)
    const rotation = (seededRandom(i) - 0.5) * 12;

    points.push({ x, y, z, rotation });
  }
  return points;
}


/**
 * Compute the average direction where photos are concentrated.
 * Returns a normalized vector pointing toward the centroid of all photos.
 * Used to orient the FPP camera so photos are in view on open.
 */
function computePhotoCentroid(positions: SpherePoint[]): THREE.Vector3 {
  if (positions.length === 0) return new THREE.Vector3(0, 0, 1);
  const sum = new THREE.Vector3(0, 0, 0);
  for (const p of positions) {
    sum.x += p.x;
    sum.y += p.y;
    sum.z += p.z;
  }
  sum.divideScalar(positions.length);

  // If centroid is near origin (photos cover whole sphere), pick the first photo's direction
  if (sum.length() < 0.5) {
    return new THREE.Vector3(positions[0].x, positions[0].y, positions[0].z).normalize();
  }
  return sum.normalize();
}

// ─── FPP FOV Zoom ────────────────────────────────────────────

const FPP_FOV_MIN = 35;
const FPP_FOV_MAX = 110;
const FPP_FOV_SENSITIVITY_WHEEL = 2.0;
const FPP_FOV_SENSITIVITY_PINCH = 0.35;
const FPP_FOV_LERP_SPEED = 0.12;

function FppFovZoom() {
  const { camera, gl } = useThree();
  const targetFovRef = useRef((camera as THREE.PerspectiveCamera).fov);
  const pinchRef = useRef({ active: false, startDist: 0, startFov: 0 });

  useEffect(() => {
    targetFovRef.current = (camera as THREE.PerspectiveCamera).fov;
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? FPP_FOV_SENSITIVITY_WHEEL : -FPP_FOV_SENSITIVITY_WHEEL;
      targetFovRef.current = Math.max(FPP_FOV_MIN, Math.min(FPP_FOV_MAX, targetFovRef.current + delta));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { active: true, startDist: getTouchDist(e), startFov: targetFovRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinchRef.current.active || e.touches.length !== 2) return;
      const dist = getTouchDist(e);
      const scale = pinchRef.current.startDist / dist;
      targetFovRef.current = Math.max(FPP_FOV_MIN, Math.min(FPP_FOV_MAX, pinchRef.current.startFov * scale));
    };
    const onTouchEnd = () => { pinchRef.current.active = false; };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [gl]);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const diff = targetFovRef.current - cam.fov;
    if (Math.abs(diff) > 0.05) {
      cam.fov += diff * FPP_FOV_LERP_SPEED;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Photo Node ──────────────────────────────────────────────

interface PhotoNodeProps {
  imageUrl: string;
  position: SpherePoint;
  index: number;
  onClick: (index: number) => void;
}

function PhotoNode({ imageUrl, position, index, onClick }: PhotoNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(index);
    },
    [onClick, index]
  );

  return (
    <group position={[position.x, position.y, position.z]}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          distanceFactor={10}
          style={{
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            transform: `rotate(${position.rotation}deg) ${hovered ? 'scale(1.15)' : 'scale(1)'}`,
            opacity: loaded ? 1 : 0.2,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          position={[0, 0, 0]}
        >
          <div
            onClick={handleClick}
            onMouseEnter={() => {
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onMouseLeave={() => {
              setHovered(false);
              document.body.style.cursor = 'default';
            }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 6,
              overflow: 'hidden',
              border: hovered ? '2px solid rgba(42,67,101,0.6)' : '1.5px solid rgba(0,0,0,0.08)',
              boxShadow: hovered
                ? '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)'
                : '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
              background: '#e8e0d4',
              userSelect: 'none' as const,
            }}
          >
            <img
              src={imageUrl}
              alt={`Photo ${index + 1}`}
              onLoad={() => setLoaded(true)}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────

interface AlbumSceneProps {
  imageUrls: string[];
  onPhotoClick: (index: number) => void;
}

function AlbumScene({ imageUrls, onPhotoClick }: AlbumSceneProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const positions = useMemo(
    () => fibonacciSphere(imageUrls.length, SPHERE_RADIUS),
    [imageUrls.length]
  );

  // Compute where photos are concentrated and orient camera toward them
  const centroid = useMemo(() => computePhotoCentroid(positions), [positions]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = isMobile ? 95 : 80;
    cam.updateProjectionMatrix();

    // Orient camera to look toward the photo centroid
    if (controlsRef.current) {
      const target = centroid.clone().multiplyScalar(0.1);
      controlsRef.current.target.set(target.x, target.y, target.z);
      controlsRef.current.update();
    }
  }, [camera, isMobile, centroid]);

  return (
    <>
      {/* Warm, soft lighting */}
      <ambientLight intensity={0.9} color="#faf3e8" />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#fff5e6" />
      <directionalLight position={[-5, 8, -3]} intensity={0.2} color="#f0e6d6" />

      {/* FPP Camera controls — camera at center, looking outward toward photos */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableRotate={true}
        minDistance={0.1}
        maxDistance={0.1}
        enableDamping={true}
        dampingFactor={0.08}
        rotateSpeed={-0.7}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 1.15}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.ROTATE,
        }}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />

      {/* FPP FOV zoom via scroll/pinch */}
      <FppFovZoom />

      {/* Photo nodes on sphere surface */}
      {imageUrls.map((url, i) => (
        <PhotoNode
          key={`photo-${i}`}
          imageUrl={url}
          position={positions[i]}
          index={i}
          onClick={onPhotoClick}
        />
      ))}
    </>
  );
}

// ─── Full-Screen Image Viewer ────────────────────────────────

interface ImageViewerProps {
  imageUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function ImageViewer({ imageUrls, currentIndex, onClose, onNavigate }: ImageViewerProps) {
  const handlePrev = useCallback(() => {
    onNavigate((currentIndex - 1 + imageUrls.length) % imageUrls.length);
  }, [currentIndex, imageUrls.length, onNavigate]);

  const handleNext = useCallback(() => {
    onNavigate((currentIndex + 1) % imageUrls.length);
  }, [currentIndex, imageUrls.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, handlePrev, handleNext]);

  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 50) {
        if (diff > 0) handlePrev();
        else handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 110,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={20} />
      </button>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 110,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.5px',
        }}
      >
        {currentIndex + 1} / {imageUrls.length}
      </div>

      {imageUrls.length > 1 && (
        <button
          onClick={handlePrev}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 110,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {imageUrls.length > 1 && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 110,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      <img
        src={imageUrls[currentIndex]}
        alt={`Photo ${currentIndex + 1}`}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

interface AlbumCosmosProps {
  imageUrls: string[];
  title: string;
  caption?: string;
  onBack: () => void;
}

export default function AlbumCosmos({ imageUrls, title, caption, onBack }: AlbumCosmosProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const handlePhotoClick = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#f2ebe0',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          padding: '44px 16px 12px',
          background: 'linear-gradient(180deg, rgba(242,235,224,0.95) 0%, rgba(242,235,224,0.6) 60%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(42,67,101,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(42,67,101,0.1)',
            color: '#2A4365',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h2
            style={{
              color: '#1a202c',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: 'rgba(26,32,44,0.4)',
              fontSize: 11,
              margin: '1px 0 0',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {imageUrls.length} {imageUrls.length === 1 ? 'photo' : 'photos'}
            {caption ? ` · ${caption}` : ''}
          </p>
        </div>
      </div>

      {/* Bottom hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 70,
          color: 'rgba(26,32,44,0.25)',
          fontSize: 10,
          fontWeight: 500,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.4px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <Maximize2 size={10} />
        Drag to look around · Pinch to zoom · Tap to view
      </div>

      {/* 3D Canvas — FPP, camera at center */}
      <Canvas
        camera={{
          position: [0, 0, 0],
          fov: 80,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        style={{ background: '#f2ebe0' }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#f2ebe0']} />
          <AlbumScene imageUrls={imageUrls} onPhotoClick={handlePhotoClick} />
        </Suspense>
      </Canvas>

      {viewerIndex !== null && (
        <ImageViewer
          imageUrls={imageUrls}
          currentIndex={viewerIndex}
          onClose={handleCloseViewer}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
