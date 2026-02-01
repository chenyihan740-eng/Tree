import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMorphState } from '../types';
import { 
  FOLIAGE_COUNT, 
  TREE_HEIGHT, 
  TREE_RADIUS, 
  COLOR_EMERALD,
  COLOR_EMERALD_LIGHT,
  TRANSITION_SPEED 
} from '../constants';

interface FoliageProps {
  state: TreeMorphState;
}

// Custom Shader Material for the Foliage
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorph: { value: 0 }, // 0 = Scattered, 1 = Tree
    uColorBase: { value: COLOR_EMERALD },
    uColorTip: { value: COLOR_EMERALD_LIGHT },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorph;
    uniform vec3 uColorBase;
    uniform vec3 uColorTip;
    
    attribute vec3 aTreePos;
    attribute float aRandom;
    attribute float aSize;
    varying vec3 vColor;
    varying float vAlpha;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      // 1. Interpolate Position
      vec3 pos = mix(position, aTreePos, smoothstep(0.0, 1.0, uMorph));

      // 2. Add organic movement (Breathing)
      // Only apply full breathing when in tree shape to simulate wind/life
      float noiseVal = snoise(vec3(pos.x * 0.5, pos.y * 0.5 + uTime * 0.5, pos.z * 0.5));
      vec3 breathOffset = vec3(
        sin(uTime * 2.0 + aRandom * 10.0) * 0.1,
        cos(uTime * 1.5 + aRandom * 10.0) * 0.1,
        0.0
      );
      
      // Apply noise mostly in tree state
      pos += breathOffset * uMorph; 
      
      // 3. Size Calculation
      // Scale down slightly when scattered, pop up when tree
      float currentSize = aSize * (0.5 + 0.5 * uMorph);
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = currentSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // 4. Color Variation
      // Mix base emerald with a lighter tip color based on noise
      vColor = mix(uColorBase, uColorTip, aRandom);
      vAlpha = 0.8 + 0.2 * sin(uTime + aRandom * 100.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft edge glow
      float glow = 1.0 - smoothstep(0.3, 0.5, dist);
      
      gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), vAlpha);
      
      // Tone mapping fix hack for raw shader usage in r3f if needed, 
      // but usually handled by canvas. 
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
};

const Foliage: React.FC<FoliageProps> = ({ state }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Generate Geometry Data
  const { positions, treePositions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(FOLIAGE_COUNT * 3);
    const treePos = new Float32Array(FOLIAGE_COUNT * 3);
    const rands = new Float32Array(FOLIAGE_COUNT);
    const s = new Float32Array(FOLIAGE_COUNT);

    for (let i = 0; i < FOLIAGE_COUNT; i++) {
      const i3 = i * 3;

      // SCATTER POS: Large Sphere
      const rScatter = 20 + Math.random() * 20;
      const thetaS = Math.random() * Math.PI * 2;
      const phiS = Math.acos(2 * Math.random() - 1);
      pos[i3] = rScatter * Math.sin(phiS) * Math.cos(thetaS);
      pos[i3 + 1] = rScatter * Math.sin(phiS) * Math.sin(thetaS);
      pos[i3 + 2] = rScatter * Math.cos(phiS);

      // TREE POS: Cone Volume (Thick Shell)
      // Height
      const normalizedY = Math.random();
      const y = (normalizedY * TREE_HEIGHT) - (TREE_HEIGHT / 2);
      
      // Radius calculation with thickness
      const maxRadiusAtY = TREE_RADIUS * (1 - normalizedY);
      // Volume sampling: r = R * sqrt(random)
      // To keep it looking like a "shell" but thick, we map random to 0.5-1.0 range mostly
      const thickness = 0.4 + (Math.random() * 0.6); 
      const rTree = maxRadiusAtY * thickness;

      const thetaT = Math.random() * Math.PI * 2;
      
      treePos[i3] = rTree * Math.cos(thetaT);
      treePos[i3 + 1] = y;
      treePos[i3 + 2] = rTree * Math.sin(thetaT);

      // Attributes
      rands[i] = Math.random();
      s[i] = 0.5 + Math.random() * 1.5; // Base size
    }

    return { positions: pos, treePositions: treePos, randoms: rands, sizes: s };
  }, []);

  useFrame((stateThree, delta) => {
    if (!shaderRef.current) return;
    
    // Update Time
    shaderRef.current.uniforms.uTime.value = stateThree.clock.elapsedTime;

    // Smoothly interpolate Morph Factor
    const targetMorph = state === TreeMorphState.TREE_SHAPE ? 1 : 0;
    shaderRef.current.uniforms.uMorph.value = THREE.MathUtils.damp(
      shaderRef.current.uniforms.uMorph.value,
      targetMorph,
      TRANSITION_SPEED,
      delta
    );
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={FOLIAGE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={FOLIAGE_COUNT}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={FOLIAGE_COUNT}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={FOLIAGE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;