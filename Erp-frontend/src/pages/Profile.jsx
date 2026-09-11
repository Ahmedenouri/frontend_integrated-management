import { useEffect, useState } from 'react';
import { changePassword, getProfile, updateProfile } from '../api/erpApi';

const initialProfileForm = {
  nom: '',
  prenom: '',
  telephone: '',
};

const initialPasswordForm = {
  ancienMotDePasse: '',
  nouveauMotDePasse: '',
  confirmationMotDePasse: '',
};

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const loadProfile = async () => {
    try {
      const { data } = await getProfile();
      setProfile(data || null);
      setProfileForm({
        nom: data?.nom || '',
        prenom: data?.prenom || '',
        telephone: data?.telephone || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage('');

    try {
      const { data } = await updateProfile(profileForm);
      setProfile(data || profile);
      setProfileMessage('Profile updated successfully.');
    } catch (error) {
      setProfileMessage(error.response?.data?.message || 'Unable to update profile.');
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage('');

    try {
      const response = await changePassword(passwordForm);
      setPasswordMessage(response?.data || 'Password changed successfully.');
      setPasswordForm(initialPasswordForm);
    } catch (error) {
      setPasswordMessage(error.response?.data?.message || error.response?.data || 'Unable to change password.');
    }
  };

  if (loading) {
    return <div className="app-card rounded-card p-4 text-center">Loading profile...</div>;
  }

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Profile</h1>
        </div>
        <p className="page-subtitle">Your account details and security settings.</p>
      </header>

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="app-card rounded-card p-4">
            <h3 className="mb-3">Account information</h3>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full name</label>
                <div className="form-control bg-light border-0">
                  {profile?.nom || ''} {profile?.prenom || ''}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <div className="form-control bg-light border-0">{profile?.email || '—'}</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <div className="form-control bg-light border-0">{profile?.telephone || '—'}</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Role</label>
                <div className="form-control bg-light border-0">{profile?.role || '—'}</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <div className="form-control bg-light border-0">
                  {profile?.estActif ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Created at</label>
                <div className="form-control bg-light border-0">{profile?.dateCreation || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="app-card rounded-card p-4 mb-4">
            <h3 className="mb-3">Update profile</h3>
            {profileMessage && <div className="alert alert-success">{profileMessage}</div>}
            <form onSubmit={handleProfileSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nom</label>
                  <input
                    className="form-control"
                    value={profileForm.nom}
                    onChange={(event) => setProfileForm({ ...profileForm, nom: event.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Prenom</label>
                  <input
                    className="form-control"
                    value={profileForm.prenom}
                    onChange={(event) => setProfileForm({ ...profileForm, prenom: event.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Telephone</label>
                  <input
                    className="form-control"
                    value={profileForm.telephone}
                    onChange={(event) => setProfileForm({ ...profileForm, telephone: event.target.value })}
                  />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Save changes</button>
            </form>
          </div>

          <div className="app-card rounded-card p-4">
            <h3 className="mb-3">Change password</h3>
            {passwordMessage && <div className="alert alert-info">{passwordMessage}</div>}
            <form onSubmit={handlePasswordSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Current password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.ancienMotDePasse}
                    onChange={(event) => setPasswordForm({ ...passwordForm, ancienMotDePasse: event.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">New password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.nouveauMotDePasse}
                    onChange={(event) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: event.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Confirm new password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.confirmationMotDePasse}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmationMotDePasse: event.target.value })}
                    required
                  />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Change password</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
