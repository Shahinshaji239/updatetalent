// src/router.js
import React from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "../App"; // assuming this is your login page
import Signup from "./Signup";
import ForgetPassword from './ForgetPassword';
import Dashboard from "./Dashboard";
import CandidatesList from "./CandidateList";

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/Signup', element: <Signup /> },
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'candidates', element: <CandidatesList /> },
  { path: '/forgot-password', element: <ForgetPassword /> },

    ]
);

export default router;
