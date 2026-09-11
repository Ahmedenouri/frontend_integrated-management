import { useEffect, useState } from 'react';
import { getProfile } from '../api/erpApi';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await getProfile();
        setProfile(data || null);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return <div className="app-card rounded-card p-4 text-center">Loading profile...</div>;
  }

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Profile</h1>
        </div>
        <p className="page-subtitle">Your account data from the ECOSCOL profile API.</p>
      </header>

      <div className="app-card rounded-card p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Full name</label>
              <div className="form-control bg-light border-0">{profile?.nom || ''} {profile?.prenom || ''}</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <div className="form-control bg-light border-0">{profile?.email || '—'}</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Phone</label>
              <div className="form-control bg-light border-0">{profile?.telephone || '—'}</div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Role</label>
              <div className="form-control bg-light border-0">{profile?.role || '—'}</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <div className="form-control bg-light border-0">{profile?.estActif ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Created at</label>
              <div className="form-control bg-light border-0">{profile?.dateCreation || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
