import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Extrude, Float } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMorphState } from '../types';
import { COLOR_GOLD, TRANSITION_SPEED } from '../constants';

interface TopStarProps {
  state: TreeMorphState;
}

const TopStar: React.FC<TopStarProps> = ({ state }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Procedural Star Shape
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.2;
    const innerRadius = 0.5;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 5
  }), []);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;

    // Target position logic
    // Raised from 7.5 to 9.2 to sit clearly on top of the tree tip (which is at y=8)
    const targetY = state === TreeMorphState.TREE_SHAPE ? 9.2 : 16; 
    const targetScale = state === TreeMorphState.TREE_SHAPE ? 1.2 : 0.01; // Slightly larger scale

    // Smooth movement
    meshRef.current.position.y = THREE.MathUtils.damp(
      meshRef.current.position.y,
      targetY,
      TRANSITION_SPEED,
      delta
    );

    // Scale animation (pop out when forming tree)
    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.damp(currentScale, targetScale, TRANSITION_SPEED, delta);
    meshRef.current.scale.setScalar(nextScale);
    
    // Rotate slowly
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.z = Math.sin(stateThree.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <Extrude
        ref={meshRef as any}
        args={[starShape, extrudeSettings]}
        position={[0, 16, 0]} // Start high
        rotation={[0, 0, Math.PI / 10]} // Initial rotation to stand straight
        renderOrder={999} // Force render on top of other transparent elements if needed, though depth test handles opacity
      >
        <meshStandardMaterial
          ref={materialRef}
          color={COLOR_GOLD}
          emissive={COLOR_GOLD}
          emissiveIntensity={2.5} // Increased bloom intensity
          metalness={1}
          roughness={0.1}
          toneMapped={false}
        />
      </Extrude>
    </Float>
  );
};

export default TopStar;