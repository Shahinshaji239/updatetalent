import React, { useState } from 'react';
import axios from 'axios';
import './forgetpassword.css';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/request-reset/', { email });
      alert('Reset code sent to your email!');
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error || 'Reset request failed.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      await axios.post('/api/reset-password/', {
        reset_code: resetCode,
        new_password: newPassword,
      });
      alert('Password reset successfully!');
      window.location.href = '/';
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed.');
    }
  };

  return (
    <div className="talent-forgot-wrapper">
      <div className="talent-forgot-card">
        <h2>Forgot Password</h2>
        {step === 1 ? (
          <form onSubmit={handleRequestReset}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
            />
            <button type="submit">Send Reset Code</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <input
              type="text"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="Enter reset code"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            <button type="submit">Reset Password</button>
          </form>
        )}
        <p><a href="/">← Back to login</a></p>
      </div>
    </div>
  );
};

export default ForgetPassword;
