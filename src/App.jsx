import React, { Suspense, lazy } from 'react';

// Example lazy-loaded components ready to use:
// const Dashboard = lazy(() => import('./components/sections/Dashboard'));

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={<div>Loading...</div>}>
        <main>
          <h1>Merchant App</h1>
          <p>Scaffolding is configured and ready. Setup is complete.</p>
        </main>
      </Suspense>
    </div>
  );
}

export default App;
