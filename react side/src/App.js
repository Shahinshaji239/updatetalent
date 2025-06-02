// App.js - Unique classnames version
import React from 'react';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBoxes, faUsers, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  return (
    <div className="landing-app-wrapper">
      {/* Navbar */}
      <header className="landing-navbar">
        <div className="landing-logo">
          <FontAwesomeIcon icon={faUsers} className="landing-logo-icon" />
          <span className="landing-logo-text">TalentStack</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <h1>
          <strong>Your talent pool,</strong>
          <br />
          <span className="landing-subtitle">beautifully organized</span>
        </h1>
        <p>
          Build, search, and share your candidate network with the recruiting tool that gets out of your way. No bloat, no complexity – just pure talent management magic. ✨
        </p>
        <div className="landing-hero-buttons">
          <button
            className="landing-btn-primary"
            onClick={() => navigate('/signup')}
          >
            Start Building For Free →
          </button>
          <button className="landing-btn-primary" onClick={() => navigate('/signup')}>
            Sign In
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature">
          <FontAwesomeIcon icon={faUsers} className="landing-feature-icon" />
          <h3>Talent Management</h3>
          <p>Efficiently manage your talent pool with smart organization tools. Track candidates, their skills, and status in one centralized platform.</p>
        </div>
        <div className="landing-feature">
          <FontAwesomeIcon icon={faSearch} className="landing-feature-icon" />
          <h3>Smart Search</h3>
          <p>Find the perfect candidate instantly with our advanced search filters. Search by skills, experience, location, and more.</p>
        </div>
        <div className="landing-feature">
          <FontAwesomeIcon icon={faChartBar} className="landing-feature-icon" />
          <h3>Analytics Dashboard</h3>
          <p>Get insights into your recruiting process with detailed analytics. Track hiring metrics, candidate sources, and team performance.</p>
        </div>
      </section>

      {/* Trusted By */}
      <section className="landing-trusted">
        <p className="landing-trust-line">Trusted by recruiting rockstars worldwide</p>
        <div className="landing-partners">
          <span>Offrolls</span>
          <span>TalentFinder</span>
          <span>HireGenius</span>
          <span>StaffMaster</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-logo">
          <FontAwesomeIcon icon={faUsers} className="landing-logo-icon" />
          <span>TalentStack</span>
        </div>
        <p className="landing-tagline">Making recruiting beautiful, one candidate at a time.</p>
      </footer>
    </div>
  );
}

export default App;