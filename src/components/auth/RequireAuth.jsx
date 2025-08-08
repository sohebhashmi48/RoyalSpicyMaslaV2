import React from 'react';
import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    // Redirect to login page if no token is found
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RequireAuth;
