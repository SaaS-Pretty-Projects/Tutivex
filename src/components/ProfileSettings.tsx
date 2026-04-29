import {type FormEvent, useEffect, useState} from 'react';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {BookOpen, Calendar, Loader2, Mail, Target, User} from 'lucide-react';
import {updateProfile} from 'firebase/auth';
import {auth, db, handleFirestoreError} from '../lib/firebase';
import {defaultMemberProfile, type MemberProfile} from '../lib/learningData';

export default function ProfileSettings() {
  const user = auth.currentUser;
  const [profile, setProfile] = useState<MemberProfile>(defaultMemberProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    async function loadProfile() {
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({
            displayName: data.displayName || user.displayName || '',
            focusGoal: data.focusGoal || defaultMemberProfile.focusGoal,
            experienceLevel: data.experienceLevel || defaultMemberProfile.experienceLevel,
            weeklyCommitment: data.weeklyCommitment || defaultMemberProfile.weeklyCommitment,
            preferredSession: data.preferredSession || defaultMemberProfile.preferredSession,
          });
        } else {
          setProfile({...defaultMemberProfile, displayName: user.displayName || ''});
        }
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      await updateProfile(user, {displayName: profile.displayName});
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        focusGoal: profile.focusGoal,
        experienceLevel: profile.experienceLevel,
        weeklyCommitment: profile.weeklyCommitment,
        preferredSession: profile.preferredSession,
      });

      setMessage('Your learning profile is updated and the dashboard will reflect the new guidance.');
    } catch (error) {
      try {
        handleFirestoreError(error, 'update', `users/${user.uid}`);
      } catch (delegatedError) {
        setErrorMessage(delegatedError instanceof Error ? delegatedError.message : 'Failed to save profile settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-white/70">Loading profile settings...</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.85fr,1.15fr] gap-6">
      <section className="liquid-glass rounded-[2rem] p-7 border border-white/8 h-fit">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3">Identity</p>
        <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-4">Tune the internal experience around how you learn</h2>
        <p className="text-white/62 leading-relaxed mb-6">
          These settings now power the dashboard copy, weekly cadence guidance, and how the app frames your next session.
        </p>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40 mb-1">Email</p>
            <p>{user.email || 'Unknown'}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40 mb-1">Join date</p>
            <p>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40 mb-1">Current system</p>
            <p>{profile.weeklyCommitment}</p>
            <p className="text-sm text-white/45 mt-1">{profile.preferredSession}</p>
          </div>
        </div>
      </section>

      <section className="liquid-glass rounded-[2rem] p-7 md:p-8 border border-white/8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3">Preferences</p>
        <h3 className="text-2xl md:text-3xl font-serif mb-6">Profile settings</h3>

        <form onSubmit={handleSave} className="space-y-5">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 inline-flex items-center gap-2">
              <User className="w-4 h-4" />
              Display name
            </span>
            <input
              type="text"
              value={profile.displayName}
              onChange={(event) => setProfile((current) => ({...current, displayName: event.target.value}))}
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 text-white outline-none focus:border-white/25"
              placeholder="How should Teachenza address you?"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 inline-flex items-center gap-2">
              <Target className="w-4 h-4" />
              Primary focus goal
            </span>
            <input
              type="text"
              value={profile.focusGoal}
              onChange={(event) => setProfile((current) => ({...current, focusGoal: event.target.value}))}
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 text-white outline-none focus:border-white/25"
              placeholder="What are you optimizing for this month?"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Experience level
              </span>
              <input
                type="text"
                value={profile.experienceLevel}
                onChange={(event) => setProfile((current) => ({...current, experienceLevel: event.target.value}))}
                className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 text-white outline-none focus:border-white/25"
                placeholder="Starter, Intermediate, Advanced"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Weekly commitment
              </span>
              <input
                type="text"
                value={profile.weeklyCommitment}
                onChange={(event) => setProfile((current) => ({...current, weeklyCommitment: event.target.value}))}
                className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 text-white outline-none focus:border-white/25"
                placeholder="How often will you train?"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 inline-flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Preferred session format
            </span>
            <input
              type="text"
              value={profile.preferredSession}
              onChange={(event) => setProfile((current) => ({...current, preferredSession: event.target.value}))}
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 text-white outline-none focus:border-white/25"
              placeholder="What kind of session helps you do your best work?"
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-white text-black px-5 py-4 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-55 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving profile...' : 'Save profile settings'}
            </button>
          </div>

          {message ? <div className="rounded-2xl bg-green-400/10 border border-green-400/20 px-4 py-3 text-sm text-green-300">{message}</div> : null}
          {errorMessage ? <div className="rounded-2xl bg-red-400/10 border border-red-400/20 px-4 py-3 text-sm text-red-300">{errorMessage}</div> : null}
        </form>
      </section>
    </div>
  );
}
