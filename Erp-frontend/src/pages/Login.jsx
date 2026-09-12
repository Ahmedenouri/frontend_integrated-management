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
      <div className="auth-shell">
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-header">
              

              <div className="auth-brand-copy">
                <div className="brand-label">Victoria Professional Institute </div>
                <small className="text-muted">Système de gestion scolaire</small>
              </div>
            </div>

            <h2>Une nouvelle expérience éducative</h2>
            <p className="auth-subtitle">Connectez-vous pour accéder à votre espace de travail.</p>
            <div className="auth-card-badge">
              <span className="auth-badge-dot" />
              Accès sécurisé
            </div>

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
                <div className="auth-field">
                  <span className="auth-field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Zm2.2 0 6.8 5.1 6.8-5.1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    className="form-control"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@school.ma"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="password">
                  Mot de passe
                </label>
                <div className="auth-field">
                  <span className="auth-field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="5" y="10" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 10V8a4 4 0 1 1 8 0v2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
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
              </div>

              <div className="auth-form-meta">
                <label className="auth-remember" htmlFor="remember-me">
                  <input id="remember-me" type="checkbox" />
                  <span>Se souvenir de moi</span>
                </label>

                <a className="auth-link" href="#">
                  Mot de passe oublié ?
                </a>
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

              <p className="auth-help-note">Besoin d’aide ? Contactez l’administration de votre campus.</p>
            </form>
          </div>
        </div>

        <div className="auth-visual">
          <img
            src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80"
            alt="Étudiante souriante"
          />

          <div className="auth-visual-overlay" />

          <div className="auth-visual-content">
            <div className="auth-visual-tag">VPI • Campus d'excellence</div>

            <div className="auth-visual-copy">
              <h1>Apprendre, grandir et réussir ensemble.</h1>
              <p>
                Une plateforme conçue pour accompagner chaque étudiant, enseignant et
                équipe pédagogique vers des résultats concrets.
              </p>
            </div>

            <div className="auth-visual-features">
              <span className="auth-feature">Cours</span>
              <span className="auth-feature">Suivi</span>
              <span className="auth-feature">Résultats</span>
            </div>

            <div className="auth-stat">
              <strong>12K+</strong>
              <span>étudiants inspirés</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
