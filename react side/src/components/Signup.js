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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


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
    setErrorMsg('');

    // Password validation
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/signup/', { 
        name: username, 
        email, 
        password 
      });
      
      if (response.data.message === 'User created successfully. Please check your email to verify your account.') {
        setShowVerificationModal(true);
        setResendTimer(60);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Signup failed. Try again.');
    }
  };


  const handleSubmit = (e) => {
    isLogin ? handleLogin(e) : handleSignup(e);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/verify-email/', { 
        email, 
        code: verificationCode 
      });
      
      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        alert('Email verified successfully!');
        setShowVerificationModal(false);
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Verification failed.');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    try {
      await axios.post('http://localhost:8000/resend-verification/', { email });
      setResendTimer(60);
      alert('Verification code resent!');
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to resend code.');
    }
  };

  const handleInputChange = (e) => {
    if (e.target.name === 'password') {
      setPassword(e.target.value);
    } else if (e.target.name === 'confirmPassword') {
      setConfirmPassword(e.target.value);
    } else if (e.target.name === 'email') {
      setEmail(e.target.value);
    } else if (e.target.name === 'username') {
      setUsername(e.target.value);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
                <input 
                  type="text" 
                  name="username"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Jane Smith" 
                  required 
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                name="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="your@email.com" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {!isLogin && (
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            <button type="submit" className="auth-button">{isLogin ? 'Sign In' : 'Create Account'}</button>
          </form>
          {isLogin && (
            <p className="forgot-password">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          )}
        </div>
        
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Verify Your Email</h3>
            <p>Please enter the verification code sent to your email address.</p>
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  required
                />
              </div>
              <button type="submit" className="auth-button">Verify Email</button>
              <button
                type="button"
                className="auth-button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                style={{ marginTop: '10px', opacity: resendTimer > 0 ? 0.7 : 1 }}
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
