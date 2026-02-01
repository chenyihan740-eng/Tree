import { Color } from 'three';
import React from 'react';

export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface ParticleData {
  id: number;
  scale: number;
  color: string;
  type: 'base' | 'gold' | 'light';
  // Pre-calculated positions for both states
  scatterPos: [number, number, number];
  treePos: [number, number, number];
  // Random offsets for organic animation
  speed: number;
  phase: number;
}

// Fix for React Three Fiber intrinsic elements missing from JSX types
// We augment both the global JSX namespace and the React module's JSX namespace
// to ensure compatibility with different TypeScript and React versions.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshStandardMaterial: any;
      instancedMesh: any;
      coneGeometry: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      group: any;
      color: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      shaderMaterial: any;
      boxGeometry: any;
      sphereGeometry: any;
      mesh: any;
      primitive: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      meshStandardMaterial: any;
      instancedMesh: any;
      coneGeometry: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      group: any;
      color: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      shaderMaterial: any;
      boxGeometry: any;
      sphereGeometry: any;
      mesh: any;
      primitive: any;
    }
  }
}