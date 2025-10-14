// src/App.jsx 
import React from 'react';
import Home from './pages/Home'; 


function App() {
  
  return (
    <div className="app-layout-container">
    
      <Home />
      
      {/* Cuando tengas el router, lo harías así: */}
      {/* <AppRouter /> */}
    </div>
  );
}

export default App;