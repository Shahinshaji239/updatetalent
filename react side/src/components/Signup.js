import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './signup.css';
import { Link } from 'react-router-dom';


export default function Signup() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60);


  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (showVerificationModal && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showVerificationModal, resendTimer]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/login/', { email, password });
      const token = response.data.access;
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error);
      if (error.response && error.response.data.error === 'Your account has been blocked by the admin.') {
        setErrorMsg('You are blocked by the admin.');
      } else {
        setErrorMsg('Invalid email or password');
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/signup/', { name: username, email, password });
      setShowVerificationModal(true);
      setResendTimer(60);
    } catch (error) {
      alert(error.response?.data?.error || 'Signup failed. Try again.');
    }
  };


  const handleSubmit = (e) => {
    isLogin ? handleLogin(e) : handleSignup(e);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/verify-email/', { email, code: verificationCode });
      localStorage.setItem('token', response.data.access);
      alert('Email verified successfully!');
      setShowVerificationModal(false);
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.error || 'Verification failed.');
    }
  };

  const handleResend = async () => {
    try {
      await axios.post('http://localhost:8000/resend-verification/', { email });
      setResendTimer(60);
      alert('Verification code resent!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to resend code.');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
      <div className="auth-wrapper">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#000" />
            <path d="M20 10L30 30H10L20 10Z" fill="#FFF" />
          </svg>
        </div>
        <h2 className="auth-title">Welcome to TalentStack</h2>
        <p className="auth-subtitle">Your recruiting journey starts here</p>
        <div className="auth-toggle">
          <button className={`toggle-btn ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Sign In</button>
          <button className={`toggle-btn ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
        </div>
        <div className="auth-card">
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Jane Smith" required />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="auth-button">{isLogin ? 'Sign In' : 'Create Account'}</button>
          </form>
          {isLogin && (
            <p className="forgot-password">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          )}
        </div>
        
      </div>
    </>
  );
}
