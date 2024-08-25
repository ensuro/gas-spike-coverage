import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import GasSpikeForm from './components/Form/GasSpikeForm';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<GasSpikeForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
