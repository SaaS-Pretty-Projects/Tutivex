import {useEffect, useState} from 'react';
import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {auth} from '../lib/firebase';

export default function ProtectedRoute() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const location = useLocation();

  useEffect(() => {
    return auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="liquid-glass rounded-3xl px-8 py-6 text-center border border-white/10">
          <p className="text-sm uppercase tracking-[0.25em] text-white/45 mb-3">Tutivex</p>
          <p className="text-white/80">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{from: location.pathname}} />;
  }

  return <Outlet />;
}
