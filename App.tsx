import React, { useState } from 'react';
import Scene from './components/Scene';
import { TreeMorphState } from './types';

// Icons
const IconTree = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
);

const IconScatter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m0-16.875L18 2.25M5.25 2.25v2.25L3 5.625M2.25 6.75l2.25-1.313M5.25 2.25L7.5 3.563M2.25 6.75L4.5 5.625m2.25 13.5h3.75m-3.75 0V21m3.75-1.875V21m-9-4.5h3.75m-3.75 0V21m3.75-1.875V21" />
  </svg>
);

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.SCATTERED);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeMorphState.TREE_SHAPE 
        ? TreeMorphState.SCATTERED 
        : TreeMorphState.TREE_SHAPE
    );
  };

  return (
    <div className="relative w-full h-full font-sans">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Scene treeState={treeState} />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-white text-3xl font-light tracking-widest uppercase" style={{ fontFamily: 'Times New Roman, serif' }}>
              Arix <span className="text-yellow-400 font-bold">Signature</span>
            </h1>
            <p className="text-emerald-200 text-sm tracking-widest mt-1 opacity-80">Interactive Holiday Experience</p>
          </div>
        </header>

        {/* Footer Controls */}
        <div className="flex flex-col items-center pointer-events-auto gap-6 mb-8">
           <button
            onClick={toggleState}
            className={`
              group relative flex items-center justify-center gap-3 px-8 py-4 
              rounded-full backdrop-blur-md border transition-all duration-500
              ${treeState === TreeMorphState.TREE_SHAPE 
                ? 'bg-emerald-900/60 border-yellow-500/50 text-yellow-100 shadow-[0_0_30px_rgba(255,215,0,0.2)]' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
            `}
          >
             <span className="relative z-10 flex items-center gap-2 font-medium tracking-wider uppercase text-sm">
                {treeState === TreeMorphState.TREE_SHAPE ? <IconScatter /> : <IconTree />}
                {treeState === TreeMorphState.TREE_SHAPE ? 'Release Magic' : 'Gather Spirit'}
             </span>
             
             {/* Glow Effect */}
             <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${treeState === TreeMorphState.TREE_SHAPE ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-yellow-400/10 blur-xl rounded-full"></div>
             </div>
          </button>

          <div className="text-white/40 text-xs tracking-widest uppercase">
            Designed for Chrome & Safari 
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
