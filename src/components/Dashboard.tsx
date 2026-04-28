import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc} from 'firebase/firestore';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Play,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import {auth, db, handleFirestoreError} from '../lib/firebase';
import {
  calculateProgress,
  courseCatalog,
  defaultMemberProfile,
  getCourseById,
  getNextModuleId,
  type MemberProfile,
} from '../lib/learningData';
import StudentArrearsBanner from './StudentArrearsBanner';

interface EnrollmentRecord {
  id: string;
  courseId: string;
  courseName: string;
  progress: number;
  currentModuleId?: string;
  completedModuleIds?: string[];
  status?: 'not_started' | 'in_progress' | 'completed';
  difficulty?: string;
  durationMinutes?: number;
  track?: string;
  summary?: string;
  lastAccessedAt?: unknown;
  enrolledAt?: unknown;
}

function toDisplayDate(value: unknown) {
  if (!value) {
    return 'Just now';
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleDateString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return 'Recently updated';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [profile, setProfile] = useState<MemberProfile>(defaultMemberProfile);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    async function loadWorkspace() {
      try {
        const [profileSnapshot, enrollmentSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getDocs(query(collection(db, `users/${user.uid}/enrollments`))),
        ]);

        if (profileSnapshot.exists()) {
          const data = profileSnapshot.data();
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

        const nextEnrollments = enrollmentSnapshot.docs.map((snapshot) => {
          const data = snapshot.data();
          return {
            id: snapshot.id,
            courseId: data.courseId,
            courseName: data.courseName,
            progress: data.progress ?? 0,
            currentModuleId: data.currentModuleId,
            completedModuleIds: data.completedModuleIds ?? [],
            status: data.status ?? 'in_progress',
            difficulty: data.difficulty,
            durationMinutes: data.durationMinutes,
            track: data.track,
            summary: data.summary,
            lastAccessedAt: data.lastAccessedAt,
            enrolledAt: data.enrolledAt,
          } as EnrollmentRecord;
        });

        setEnrollments(nextEnrollments);
      } catch (error) {
        console.error('Failed to load workspace', error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [navigate, user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      return;
    }

    const course = getCourseById(courseId);
    if (!course) {
      return;
    }

    setEnrollingId(courseId);

    const optimisticEnrollment: EnrollmentRecord = {
      id: course.id,
      courseId: course.id,
      courseName: course.title,
      progress: 0,
      currentModuleId: course.modules[0]?.id ?? '',
      completedModuleIds: [],
      status: 'not_started',
      difficulty: course.difficulty,
      durationMinutes: course.durationMinutes,
      track: course.track,
      summary: course.summary,
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
    };

    setEnrollments((current) => [...current, optimisticEnrollment]);

    try {
      await setDoc(doc(db, `users/${user.uid}/enrollments`, course.id), {
        courseId: course.id,
        courseName: course.title,
        progress: 0,
        currentModuleId: course.modules[0]?.id ?? '',
        completedModuleIds: [],
        status: 'not_started',
        difficulty: course.difficulty,
        durationMinutes: course.durationMinutes,
        track: course.track,
        summary: course.summary,
        enrolledAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp(),
      });
    } catch (error) {
      setEnrollments((current) => current.filter((enrollment) => enrollment.courseId !== courseId));
      try {
        handleFirestoreError(error, 'create', `users/${user.uid}/enrollments/${course.id}`);
      } catch (delegatedError) {
        console.error('Enrollment write failed', delegatedError);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  if (!user || loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-white/75">Loading your internal workspace...</div>;
  }

  const queryText = searchQuery.toLowerCase();
  const courseRows = courseCatalog.map((course) => ({
    course,
    enrollment: enrollments.find((entry) => entry.courseId === course.id) ?? null,
  }));

  const filteredCourseRows = courseRows.filter(({course, enrollment}) => {
    const haystack = [course.title, course.description, course.track, enrollment?.courseName ?? ''].join(' ').toLowerCase();
    return haystack.includes(queryText);
  });

  const activeRows = filteredCourseRows.filter(({enrollment}) => enrollment && enrollment.progress < 100);
  const completedRows = filteredCourseRows.filter(({enrollment}) => enrollment && enrollment.progress >= 100);
  const availableRows = filteredCourseRows.filter(({enrollment}) => !enrollment);

  const nextFocusRow = activeRows[0] ?? filteredCourseRows.find(({enrollment}) => enrollment) ?? null;
  const activeEnrollmentCount = enrollments.filter((enrollment) => enrollment.progress < 100).length;
  const averageProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length)
      : 0;
  const totalMinutes = enrollments.reduce((sum, enrollment) => {
    const fallbackCourse = getCourseById(enrollment.courseId);
    return sum + (enrollment.durationMinutes || fallbackCourse?.durationMinutes || 0);
  }, 0);

  const firstName = profile.displayName || user.displayName || user.email?.split('@')[0] || 'Learner';
  const focusHeadline = nextFocusRow
    ? `Continue ${nextFocusRow.course.title} with a lighter switch cost.`
    : 'Start a new learning track and build momentum this week.';
  const nextModuleTitle =
    nextFocusRow && nextFocusRow.enrollment
      ? getCourseById(nextFocusRow.enrollment.courseId)?.modules.find(
          (module) => module.id === (nextFocusRow.enrollment?.currentModuleId || getNextModuleId(nextFocusRow.course, nextFocusRow.enrollment?.completedModuleIds ?? [])),
        )?.title
      : null;

  return (
    <div className="space-y-8 md:space-y-10">
      <StudentArrearsBanner onTopUp={(currency) => navigate(`/credits?currency=${currency}`)} />

      <section className="grid grid-cols-1 xl:grid-cols-[1.5fr,1fr] gap-6">
        <div className="liquid-glass rounded-[2rem] p-7 md:p-9 border border-white/10 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_40%)] pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-4">Focus Blueprint</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight mb-4">
              {firstName}, {focusHeadline}
            </h2>
            <p className="max-w-2xl text-white/60 leading-relaxed mb-8">
              Your current goal is <span className="text-white">{profile.focusGoal}</span>. Keep the system simple:
              {` `}{profile.weeklyCommitment.toLowerCase()} anchored around {profile.preferredSession.toLowerCase()}.
            </p>
            <div className="flex flex-wrap gap-3">
              {nextFocusRow ? (
                <Link
                  to={`/courses/${nextFocusRow.course.id}`}
                  className="bg-white text-black rounded-full px-5 py-3 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Continue {nextFocusRow.course.title}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => availableRows[0] && handleEnroll(availableRows[0].course.id)}
                  className="bg-white text-black rounded-full px-5 py-3 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start your first track
                </button>
              )}
              <Link
                to="/profile"
                className="rounded-full px-5 py-3 text-sm font-medium border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition-colors"
              >
                Refine learning profile
              </Link>
              <Link
                to="/credits"
                className="rounded-full px-5 py-3 text-sm font-medium border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition-colors inline-flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Top up credits
              </Link>
            </div>
            {nextModuleTitle ? (
              <p className="mt-6 text-sm text-white/45">Next recommended module: {nextModuleTitle}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4">
          <div className="liquid-glass rounded-3xl p-6 border border-white/8">
            <div className="flex items-center gap-3 text-white/50 mb-4">
              <BookOpen className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.24em]">Active Tracks</span>
            </div>
            <p className="text-4xl font-serif">{activeEnrollmentCount}</p>
            <p className="text-sm text-white/45 mt-2">Courses currently in motion</p>
          </div>
          <div className="liquid-glass rounded-3xl p-6 border border-white/8">
            <div className="flex items-center gap-3 text-white/50 mb-4">
              <Activity className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.24em]">Average Progress</span>
            </div>
            <p className="text-4xl font-serif">{averageProgress}%</p>
            <p className="text-sm text-white/45 mt-2">Across your enrolled curriculum</p>
          </div>
          <div className="liquid-glass rounded-3xl p-6 border border-white/8">
            <div className="flex items-center gap-3 text-white/50 mb-4">
              <Clock3 className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.24em]">Guided Minutes</span>
            </div>
            <p className="text-4xl font-serif">{totalMinutes}</p>
            <p className="text-sm text-white/45 mt-2">Minutes inside your enrolled tracks</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.15fr,0.85fr] gap-6">
        <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-2">Roadmap</p>
              <h3 className="text-2xl md:text-3xl font-serif">Your internal learning map</h3>
            </div>
            <div className="w-full md:w-72 relative">
              <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tracks, modules, and topics"
                className="w-full rounded-full bg-white/5 border border-white/10 py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredCourseRows.map(({course, enrollment}) => {
              const completedCount = enrollment?.completedModuleIds?.length ?? Math.round(((enrollment?.progress ?? 0) / 100) * course.modules.length);
              const statusLabel = enrollment
                ? enrollment.progress >= 100
                  ? 'Mastered'
                  : enrollment.status === 'not_started'
                    ? 'Queued'
                    : 'In Progress'
                : 'Available';

              return (
                <div key={course.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/45">{course.track}</span>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/25">•</span>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/45">{course.difficulty}</span>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/25">•</span>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/45">{statusLabel}</span>
                      </div>
                      <h4 className="text-xl font-medium tracking-tight mb-2">{course.title}</h4>
                      <p className="text-white/60 leading-relaxed mb-4">{course.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-3">
                          <p className="text-white/40 text-xs uppercase tracking-[0.18em] mb-1">Modules</p>
                          <p>{completedCount}/{course.modules.length} completed</p>
                        </div>
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-3">
                          <p className="text-white/40 text-xs uppercase tracking-[0.18em] mb-1">Guided Time</p>
                          <p>{course.durationMinutes} minutes</p>
                        </div>
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-3">
                          <p className="text-white/40 text-xs uppercase tracking-[0.18em] mb-1">Weekly Outcome</p>
                          <p>{course.weeklyOutcome}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-56 shrink-0">
                      {enrollment ? (
                        <>
                          <div className="flex justify-between text-xs text-white/45 mb-2">
                            <span>Progress</span>
                            <span>{enrollment.progress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-4">
                            <div className="h-full bg-white rounded-full transition-all duration-500" style={{width: `${enrollment.progress}%`}} />
                          </div>
                          <Link
                            to={`/courses/${course.id}`}
                            className="w-full bg-white text-black rounded-2xl px-4 py-3 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            {enrollment.progress >= 100 ? 'Review course' : 'Continue'}
                          </Link>
                          <p className="text-xs text-white/35 mt-3">Last touched {toDisplayDate(enrollment.lastAccessedAt)}</p>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="w-full rounded-2xl px-4 py-3 text-sm font-medium border border-white/15 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white inline-flex items-center justify-center gap-2"
                          >
                            {enrollingId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {enrollingId === course.id ? 'Starting track...' : 'Enroll now'}
                          </button>
                          <p className="text-xs text-white/35 mt-3">{course.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-3">Personalization</p>
            <h3 className="text-2xl font-serif mb-5">Your current operating settings</h3>
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Primary Goal</p>
                <p>{profile.focusGoal}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Experience Level</p>
                <p>{profile.experienceLevel}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Commitment + Session Style</p>
                <p>{profile.weeklyCommitment}</p>
                <p className="text-sm text-white/45 mt-1">{profile.preferredSession}</p>
              </div>
            </div>
            <Link
              to="/profile"
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Refine these settings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-3">Execution Notes</p>
            <h3 className="text-2xl font-serif mb-5">How to use the internal app this week</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Target className="w-5 h-5 mt-1 text-white/60 shrink-0" />
                <p className="text-white/65 leading-relaxed">
                  Keep one course as your primary track and use the others as supporting systems, not parallel distractions.
                </p>
              </div>
              <div className="flex gap-3">
                <Clock3 className="w-5 h-5 mt-1 text-white/60 shrink-0" />
                <p className="text-white/65 leading-relaxed">
                  Use {profile.preferredSession.toLowerCase()} and leave a written re-entry note after each module to reduce restart friction.
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 mt-1 text-white/60 shrink-0" />
                <p className="text-white/65 leading-relaxed">
                  Treat module completion as an execution checkpoint. The course view now keeps current module, completed modules, and status in sync.
                </p>
              </div>
            </div>
          </div>

          {completedRows.length > 0 ? (
            <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-3">Completed</p>
              <h3 className="text-2xl font-serif mb-5">Mastered tracks</h3>
              <div className="space-y-3">
                {completedRows.map(({course, enrollment}) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="block rounded-2xl bg-white/[0.03] border border-white/6 px-4 py-4 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-white/45">{course.track}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-green-400">
                        {enrollment?.progress ?? calculateProgress(course.modules.length, course.modules.map((module) => module.id))}% mastered
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
