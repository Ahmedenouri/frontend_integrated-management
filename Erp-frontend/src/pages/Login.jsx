import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Impossible de se connecter. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="brand-mark">E</div>
          <div>
            <div className="brand-label">ECOSCOL ERP</div>
            <small className="text-muted">Système de gestion scolaire</small>
          </div>
        </div>

        <h2>Bon retour</h2>
        <p className="auth-subtitle">Connectez-vous pour accéder à votre espace de travail.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">
              Adresse email
            </label>
            <input
              id="email"
              className="form-control"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ahmed.ennouri@school.ma"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              className="form-control"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Entrez votre mot de passe"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
