import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMorphState } from '../types';
import { 
  ORNAMENT_COUNT, 
  TREE_HEIGHT, 
  TREE_RADIUS, 
  COLOR_GOLD, 
  COLOR_WARM_WHITE, 
  TRANSITION_SPEED 
} from '../constants';

interface OrnamentData {
  id: number;
  type: 'gift' | 'bauble';
  color: THREE.Color;
  scatterPos: THREE.Vector3;
  treePos: THREE.Vector3;
  scale: number;
  spinVector: THREE.Vector3; // Independent rotation speeds for x, y, z
  phase: number;
}

interface OrnamentsProps {
  state: TreeMorphState;
}

const tempObject = new THREE.Object3D();

const Ornaments: React.FC<OrnamentsProps> = ({ state }) => {
  const giftsRef = useRef<THREE.InstancedMesh>(null);
  const baublesRef = useRef<THREE.InstancedMesh>(null);

  // Generate Data
  const { gifts, baubles } = useMemo(() => {
    const _gifts: OrnamentData[] = [];
    const _baubles: OrnamentData[] = [];

    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const isGift = Math.random() > 0.7; // 30% gifts, 70% baubles
      
      // Tree Position (Surface biased)
      // Cap height at 0.94 to leave space for TopStar (Tree top is 1.0)
      const normalizedY = Math.random() * 0.94;
      const y = (normalizedY * TREE_HEIGHT) - (TREE_HEIGHT / 2);
      // Ornaments sit on the outer edge
      const rBase = TREE_RADIUS * (1 - normalizedY);
      const r = rBase * (0.85 + Math.random() * 0.3); // Slightly in or out
      const theta = Math.random() * Math.PI * 2;
      
      const treePos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));

      // Scatter Position
      const rScatter = 15 + Math.random() * 25;
      const thetaS = Math.random() * Math.PI * 2;
      const phiS = Math.acos(2 * Math.random() - 1);
      const scatterPos = new THREE.Vector3(
        rScatter * Math.sin(phiS) * Math.cos(thetaS),
        rScatter * Math.sin(phiS) * Math.sin(thetaS),
        rScatter * Math.cos(phiS)
      );

      // Random spin for scattered state
      const spinVector = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );

      const data: OrnamentData = {
        id: i,
        type: isGift ? 'gift' : 'bauble',
        // Gifts are Gold or Dark Green, Baubles are Gold or Warm White
        color: isGift 
           ? (Math.random() > 0.5 ? COLOR_GOLD : new THREE.Color('#022b1c')) 
           : (Math.random() > 0.8 ? COLOR_WARM_WHITE : COLOR_GOLD),
        scale: isGift ? 0.6 + Math.random() * 0.4 : 0.3 + Math.random() * 0.3,
        spinVector,
        phase: Math.random() * Math.PI * 2,
        scatterPos,
        treePos
      };

      if (isGift) _gifts.push(data);
      else _baubles.push(data);
    }
    return { gifts: _gifts, baubles: _baubles };
  }, []);

  // Set initial colors
  useLayoutEffect(() => {
    if (giftsRef.current) {
      gifts.forEach((d, i) => {
        giftsRef.current!.setColorAt(i, d.color);
      });
      giftsRef.current.instanceColor!.needsUpdate = true;
    }
    if (baublesRef.current) {
      baubles.forEach((d, i) => {
        baublesRef.current!.setColorAt(i, d.color);
      });
      baublesRef.current.instanceColor!.needsUpdate = true;
    }
  }, [gifts, baubles]);

  // Shader Injection Logic for Sparkles
  const onBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
    shader.uniforms.uTime = { value: 0 };

    // Inject noise function and varying
    shader.fragmentShader = `
      uniform float uTime;
      
      // Fast hash for noise
      float sparkHash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      ${shader.fragmentShader}
    `;

    // Inject sparkle calculation
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `
      #include <tonemapping_fragment>

      // Calculate Sparkle
      // We use view space position for a "glitter" effect that changes as you look around
      // Scale it up for high frequency
      vec3 sparkPos = vViewPosition * 8.0; 
      
      // Add some time-based movement to the noise coordinates
      float h = sparkHash(floor(sparkPos + vec3(0.0, uTime * 0.2, 0.0)));
      
      // Threshold for sparkles (only top 1%)
      float sparkle = step(0.99, h);
      
      // Blink animation
      float blink = sin(uTime * 4.0 + h * 100.0) * 0.5 + 0.5;
      
      // Mix sparkle color (Gold/White)
      vec3 sparkColor = vec3(1.0, 0.9, 0.6); 
      
      // Add to output
      gl_FragColor.rgb += sparkColor * sparkle * blink * 0.6;
      `
    );

    // Save shader reference for updating uniforms
    shader.userData = { ...shader.userData, uniforms: shader.uniforms };
  }, []);

  useFrame((stateThree, delta) => {
    const time = stateThree.clock.elapsedTime;
    const isTree = state === TreeMorphState.TREE_SHAPE;

    // Correct way to update uniforms injected via onBeforeCompile:
    if (giftsRef.current) {
       const mat = giftsRef.current.material as THREE.MeshStandardMaterial;
       if (mat.userData.shader) mat.userData.shader.uniforms.uTime.value = time;
    }
    if (baublesRef.current) {
       const mat = baublesRef.current.material as THREE.MeshStandardMaterial;
       if (mat.userData.shader) mat.userData.shader.uniforms.uTime.value = time;
    }

    // Helper to update a mesh position/rotation
    const updateMesh = (mesh: THREE.InstancedMesh, data: OrnamentData[]) => {
      data.forEach((d, i) => {
        // Target Position Logic
        let tx, ty, tz;
        
        if (isTree) {
           // Tree Mode: Minimal hovering/breathing
           tx = d.treePos.x + Math.sin(time * 1.5 + d.phase) * 0.02;
           ty = d.treePos.y + Math.cos(time * 1.0 + d.phase) * 0.05; // Vertical Bob
           tz = d.treePos.z + Math.sin(time * 1.5 + d.phase + 1) * 0.02;
        } else {
           // Scatter Mode: Wide, organic floating (3D Lissajous-ish)
           tx = d.scatterPos.x + Math.sin(time * 0.3 + d.phase) * 1.5;
           ty = d.scatterPos.y + Math.cos(time * 0.4 + d.phase * 0.5) * 1.5;
           tz = d.scatterPos.z + Math.sin(time * 0.5 + d.phase * 0.8) * 1.5;
        }

        // Current Transform
        mesh.getMatrixAt(i, tempObject.matrix);
        tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);

        // Damp Position
        const dampSpeed = d.type === 'gift' ? TRANSITION_SPEED * 0.8 : TRANSITION_SPEED;
        
        tempObject.position.x = THREE.MathUtils.damp(tempObject.position.x, tx, dampSpeed, delta);
        tempObject.position.y = THREE.MathUtils.damp(tempObject.position.y, ty, dampSpeed, delta);
        tempObject.position.z = THREE.MathUtils.damp(tempObject.position.z, tz, dampSpeed, delta);

        // Rotation Logic
        if (d.type === 'gift') {
            const targetRotX = isTree 
                ? Math.sin(time * 1.5 + d.phase) * 0.08 
                : time * d.spinVector.x;

            const targetRotY = isTree 
                ? d.phase + Math.sin(time * 1 + d.phase) * 0.1 
                : time * d.spinVector.y;

            const targetRotZ = isTree 
                ? Math.cos(time * 1.2 + d.phase) * 0.08 
                : time * d.spinVector.z;

            tempObject.rotation.x = THREE.MathUtils.damp(tempObject.rotation.x, targetRotX, dampSpeed, delta);
            tempObject.rotation.y = THREE.MathUtils.damp(tempObject.rotation.y, targetRotY, dampSpeed, delta);
            tempObject.rotation.z = THREE.MathUtils.damp(tempObject.rotation.z, targetRotZ, dampSpeed, delta);

        } else {
            tempObject.rotation.x = THREE.MathUtils.damp(tempObject.rotation.x, isTree ? 0 : time * d.spinVector.x, dampSpeed, delta);
            tempObject.rotation.y += delta * 0.5; 
            tempObject.rotation.z = THREE.MathUtils.damp(tempObject.rotation.z, isTree ? 0 : time * d.spinVector.z, dampSpeed, delta);
        }

        // Scale
        tempObject.scale.setScalar(d.scale);

        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    if (giftsRef.current) updateMesh(giftsRef.current, gifts);
    if (baublesRef.current) updateMesh(baublesRef.current, baubles);
  });

  return (
    <group>
      {/* GIFTS: Boxes */}
      <instancedMesh ref={giftsRef} args={[undefined, undefined, gifts.length]}>
        <boxGeometry args={[1, 1, 1]} /> 
        <meshStandardMaterial 
            metalness={0.6} 
            roughness={0.2} 
            emissive={new THREE.Color('#000000')}
            onBeforeCompile={(shader) => {
              onBeforeCompile(shader);
              if (giftsRef.current) {
                 (giftsRef.current.material as THREE.MeshStandardMaterial).userData.shader = shader;
              }
            }}
        />
      </instancedMesh>

      {/* BAUBLES: Spheres */}
      <instancedMesh ref={baublesRef} args={[undefined, undefined, baubles.length]}>
        <sphereGeometry args={[1, 16, 16]} /> 
        <meshStandardMaterial 
            metalness={1} 
            roughness={0.05} 
            emissive={COLOR_GOLD}
            emissiveIntensity={0.2}
            toneMapped={false}
            onBeforeCompile={(shader) => {
              onBeforeCompile(shader);
              if (baublesRef.current) {
                 (baublesRef.current.material as THREE.MeshStandardMaterial).userData.shader = shader;
              }
            }}
        />
      </instancedMesh>
    </group>
  );
};

export default Ornaments;