import React, { useState, useEffect } from 'react';
import { Users, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import axios from 'axios';
import dayjs from 'dayjs';

const Dashboard = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/candidates/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCandidates(res.data);
      } catch (err) {
        console.error('Error fetching candidates:', err);
      }
    };

    fetchCandidates();
  }, []);

  const totalCandidates = candidates.length;
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');

  const candidatesAddedToday = candidates.filter(c =>
    dayjs(c.created_at).isSame(today, 'day')
  ).length;

  const yesterdayCount = candidates.filter(c =>
    dayjs(c.created_at).isSame(yesterday, 'day')
  ).length;

  const growthRate = yesterdayCount === 0
    ? 'N/A'
    : `${(((candidatesAddedToday - yesterdayCount) / yesterdayCount) * 100).toFixed(1)}%`;

  const handleNavigateToCandidates = () => {
    navigate('/candidates');
  };

  const handleBulkImport = () => {
    navigate('/candidates', { state: { triggerImport: true } });
  };

  return (
    <div className="talent-dashboard">
      <Navbar />
      <main className="talent-dashboard-main">
        <div className="talent-dashboard-container">
          <div className="talent-dashboard-header">
            <h1>Your Talent Stack</h1>
            <p>Manage your candidate pipeline like a pro</p>
          </div>

          <div className="talent-cards">
            <div className="talent-card">
              <div className="talent-card-header">
                <span>Total Candidates</span>
                <Users size={18} />
              </div>
              <div className="talent-card-value">{totalCandidates}</div>
              <div className="talent-card-sub green">All Time</div>
            </div>

            <div className="talent-card">
              <div className="talent-card-header">
                <span>Candidates Added</span>
                <Users size={18} />
              </div>
              <div className="talent-card-value">{candidatesAddedToday}</div>
              <div className="talent-card-sub blue">Today</div>
            </div>

            <div className="talent-card">
              <div className="talent-card-header">
                <span>Growth Rate</span>
                <Users size={18} />
              </div>
              <div className="talent-card-value">{growthRate}</div>
              <div className="talent-card-sub purple">vs Yesterday</div>
            </div>
          </div>

          <div className="talent-quick-actions">
            <h2>Quick Actions</h2>
            <div className="talent-actions-grid">
              <button className="talent-action primary" onClick={handleNavigateToCandidates}>
                <Users size={18} />
                View All Candidates
              </button>
              <button className="talent-action" onClick={handleBulkImport}>
                <Download size={18} />
                Bulk Import
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
