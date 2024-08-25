import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import GasSpikeForm from './components/Form/GasSpikeForm';
import AccountStatus from './components/AccountStatus/AccountStatus';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<GasSpikeForm />} />
          <Route path="/status" element={<AccountStatus />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
