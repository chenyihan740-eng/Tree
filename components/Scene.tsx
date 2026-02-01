import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { TreeMorphState } from '../types';
import ArixTree from './ArixTree';
import TopStar from './TopStar';
import { COLOR_GOLD, COLOR_EMERALD } from '../constants';

interface SceneProps {
  treeState: TreeMorphState;
}

const Scene: React.FC<SceneProps> = ({ treeState }) => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      gl={{ antialias: false, toneMappingExposure: 1.5 }} // Disable default AA for PostProcessing performance, boost exposure
    >
      <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={45} />
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2}
        minDistance={10}
        maxDistance={40}
        autoRotate={treeState === TreeMorphState.TREE_SHAPE}
        autoRotateSpeed={0.5}
      />

      {/* Lighting System */}
      <ambientLight intensity={0.2} color={COLOR_EMERALD} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={2} 
        color="#ffecd2" // Warm Sun
      />
      <pointLight position={[-10, -5, -5]} intensity={1} color={COLOR_GOLD} />

      {/* Environment Reflections */}
      <Environment preset="city" />

      {/* Content */}
      <group position={[0, -2, 0]}>
        <ArixTree state={treeState} />
        <TopStar state={treeState} />
      </group>

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        {/* Intense Bloom for the Gold and Lights */}
        <Bloom 
          luminanceThreshold={0.8} // Only very bright things glow
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
      
      {/* Background to make it seamless */}
      <color attach="background" args={['#010a05']} />
    </Canvas>
  );
};

export default Scene;
