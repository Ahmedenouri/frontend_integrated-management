const UnauthorizedPage = () => {
  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div className="brand-mark mx-auto mb-3">!</div>
        <h2>Access denied</h2>
        <p className="auth-subtitle mb-4">
          You do not have permission to view this section of ECOSCOL ERP.
        </p>
        <a className="btn btn-primary" href="/">
          Return to dashboard
        </a>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
