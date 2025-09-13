import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';
import axios from 'axios';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    is_admin: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const openModal = () => {
    setIsModalOpen(true);
    setIsDropdownOpen(false);
  };
  const closeModal = () => setIsModalOpen(false);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      await axios.post('/api/logout/', {
        refresh_token: refreshToken,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
    }
  };

  useEffect(() => {
    if (!['/dashboard', '/candidates'].includes(location.pathname)) return;
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('/api/profile/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(res.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, [location.pathname]);

  return (
    <>
      <nav className="talent-navbar">
        <div className="talent-navbar-left">
          <div className="landing-logo">
            <FontAwesomeIcon icon={faUsers} className="landing-logo-icon" />
            <span className="landing-logo-text">TalentStack</span>
          </div>
        </div>

        <div className="talent-navbar-center">
          <div className="talent-nav-links">
            <Link to="/dashboard" className={isActive('/dashboard') ? 'talent-nav-link active' : 'talent-nav-link'}>
              Dashboard
            </Link>
            <Link to="/candidates" className={isActive('/candidates') ? 'talent-nav-link active' : 'talent-nav-link'}>
              Candidates
            </Link>
          </div>
        </div>

        <div className="talent-navbar-right">
          <div className="talent-user-section">
            <span className="talent-greeting">Hello, {userDetails.name || 'User'} 👋</span>
            <div className="talent-profile-container">
              <div className="talent-profile-icon" onClick={toggleDropdown}>
                <User className="talent-profile-icon-svg" />
              </div>

              {isDropdownOpen && (
                <div className="talent-dropdown-menu">
                  <button onClick={openModal} className="talent-dropdown-item">User Details</button>
                  <button onClick={handleLogout} className="talent-dropdown-item">Log Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isModalOpen && (
        <div className="talent-modal-overlay" onClick={closeModal}>
          <div className="talent-right-modal" onClick={(e) => e.stopPropagation()}>
            <div className="talent-modal-header">
              <h2>Profile Settings</h2>
              <button className="talent-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="talent-modal-body">
              <div className="talent-profile-avatar">
                <div className="talent-avatar-circle">
                  <User className="talent-avatar-icon" />
                </div>
              </div>
              <div className="talent-form-group">
                <label>Full Name</label>
                <input type="text" value={userDetails.name} readOnly />
              </div>
              <div className="talent-form-group">
                <label>Email</label>
                <input type="email" value={userDetails.email} readOnly />
              </div>
              <div className="talent-form-group">
                <label>Role</label>
                <input type="text" value={userDetails.is_admin ? 'Admin' : 'Recruiter'} readOnly />
              </div>
            </div>
            <div className="talent-modal-footer">
              <button className="talent-modal-btn talent-cancel-btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
