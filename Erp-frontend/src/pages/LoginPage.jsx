import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axiosClient.post('/api-auth/login', {
        username: form.username,
        password: form.password,
      });

      const token = data?.token || data?.accessToken || data?.jwt;
      const profile = data?.profile || data?.user || null;

      if (!token) {
        throw new Error('Authentication failed. Please contact the administrator.');
      }

      await login(token, profile);
      navigate('/');
    } catch (submitError) {
      const message = submitError.response?.data?.message || submitError.message || 'Unable to sign in.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="brand-mark">VPI</div>
          <div>
            <div className="brand-label">Victoria Professional Institute</div>
            <small className="text-muted">School Management System</small>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue to your workspace.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="form-control"
              type="text"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="form-control"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
