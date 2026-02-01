import React from 'react';
import { TreeMorphState } from '../types';
import Foliage from './Foliage';
import Ornaments from './Ornaments';

interface ArixTreeProps {
  state: TreeMorphState;
}

const ArixTree: React.FC<ArixTreeProps> = ({ state }) => {
  return (
    <group>
        {/* Layer 1: The Needle Foliage (Points) */}
        <Foliage state={state} />
        
        {/* Layer 2: The Decorations (Instanced Meshes) */}
        <Ornaments state={state} />
    </group>
  );
};

export default ArixTree;
