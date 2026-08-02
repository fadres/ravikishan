import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function fmtKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayKeyToDate(key) {
  return new Date(`${key}T00:00:00`);
}

export default function PlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState(null);
  const [goals, setGoals] = useState([]);
  const [exams, setExams] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [itemForm, setItemForm] = useState({ title: '', date: '', time: '18:00', durationMinutes: 30 });
  const [goalForm, setGoalForm] = useState({ title: '', period: 'daily', targetUnits: 30, unitType: 'minutes' });
  const [examForm, setExamForm] = useState({ title: '', examDate: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      const [vRes, gRes, eRes] = await Promise.all([
        api(`/api/planner/planner?from=${weekStart.toISOString()}&to=${end.toISOString()}`),
        api('/api/planner/goals'),
        api('/api/planner/exams'),
      ]);
      setView(vRes);
      setGoals(gRes.goals || []);
      setExams(eRes);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your planner.');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    load();
  }, [user, navigate, load]);

  const addItem = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api('/api/planner/plan', {
        method: 'POST',
        body: { ...itemForm, date: new Date(`${itemForm.date}T00:00:00`).toISOString() },
      });
      setItemForm({ title: '', date: '', time: '18:00', durationMinutes: 30 });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add the plan item.');
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = async (id) => {
    await api(`/api/planner/plan/${id}/toggle`, { method: 'POST' });
    await load();
  };

  const removeItem = async (id) => {
    await api(`/api/planner/plan/${id}`, { method: 'DELETE' });
    await load();
  };

  const addGoal = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api('/api/planner/goals', { method: 'POST', body: goalForm });
      setGoalForm({ title: '', period: 'daily', targetUnits: 30, unitType: 'minutes' });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add the goal.');
    } finally {
      setBusy(false);
    }
  };

  const updateGoal = async (goal, progress) => {
    if (progress < 0 || progress > goal.targetUnits) return;
    await api(`/api/planner/goals/${goal.id}`, { method: 'PATCH', body: { progress } });
    await load();
  };

  const removeGoal = async (id) => {
    await api(`/api/planner/goals/${id}`, { method: 'DELETE' });
    await load();
  };

  const addExam = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api('/api/planner/exams', {
        method: 'POST',
        body: { ...examForm, examDate: new Date(`${examForm.examDate}T09:00:00`).toISOString() },
      });
      setExamForm({ title: '', examDate: '', notes: '' });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add the exam.');
    } finally {
      setBusy(false);
    }
  };

  const removeExam = async (id) => {
    await api(`/api/planner/exams/${id}`, { method: 'DELETE' });
    await load();
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const itemsByDay = new Map();
  for (const day of view?.days || []) {
    itemsByDay.set(day.date, day.items);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Study Planner</h1>
      <p className="text-sm text-slate-400 mb-8">Plan revision sessions, track goals and keep exams in sight.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'week', label: '📅 Week' },
          { id: 'goals', label: '🎯 Goals' },
          { id: 'exams', label: '📝 Exams' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              tab === t.id ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300' : 'text-slate-300 bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

      {tab === 'week' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition"
            >
              ← Previous
            </button>
            <p className="text-sm font-bold text-white">
              {weekDays[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} –{' '}
              {weekDays[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </p>
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition"
            >
              Next →
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {weekDays.map((d) => {
              const key = fmtKey(d);
              const items = itemsByDay.get(key) || [];
              const today = fmtKey(new Date()) === key;
              const done = items.filter((i) => i.completedAt).length;
              return (
                <section
                  key={key}
                  className={`glass rounded-2xl p-4 ${today ? 'border-aqua-400/60' : ''}`}
                  aria-label={d.toLocaleDateString()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className={`font-bold text-sm ${today ? 'text-aqua-300' : 'text-white'}`}>
                      {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {today && <span className="ml-2 text-[10px] uppercase tracking-wider text-aqua-300">today</span>}
                    </h2>
                    <span className="text-xs text-slate-400">{done}/{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-500">Nothing planned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((i) => (
                        <li key={i.id} className="text-sm">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => toggleItem(i.id)}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[9px] transition ${
                                i.completedAt ? 'bg-emerald-400 border-emerald-400 text-deep-900' : 'border-white/30 hover:border-aqua-400'
                              }`}
                              aria-label={i.completedAt ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {i.completedAt && '✓'}
                            </button>
                            <span className={`flex-1 ${i.completedAt ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {i.title}
                            </span>
                            <button
                              onClick={() => removeItem(i.id)}
                              className="text-slate-500 hover:text-rose-300 transition text-xs"
                              aria-label={`Delete ${i.title}`}
                            >
                              ✕
                            </button>
                          </div>
                          <p className="pl-6 text-xs text-slate-500">
                            {i.time ? `${i.time} · ` : ''}{i.durationMinutes} min
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <form onSubmit={addItem} className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">Add a plan item</h2>
            {formError && (
              <p className="text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">{formError}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">What will you study?</label>
                <input type="text" required minLength={2} maxLength={200} value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} className={inputCls} placeholder="e.g. Revise Newton's laws" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" required value={itemForm.date} onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Duration (min)</label>
                <input type="number" required min={5} max={600} step={5} value={itemForm.durationMinutes} onChange={(e) => setItemForm({ ...itemForm, durationMinutes: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <button disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition">
              {busy ? 'Adding…' : 'Add to plan'}
            </button>
          </form>
        </>
      )}

      {tab === 'goals' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {goals.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center md:col-span-2">
                <p className="text-slate-300">No goals yet — set a daily study target to build momentum.</p>
              </div>
            ) : (
              goals.map((g) => {
                const pct = g.targetUnits > 0 ? Math.min(100, Math.round((g.progress / g.targetUnits) * 100)) : 0;
                return (
                  <div key={g.id} className="glass rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h2 className="font-bold text-white text-sm">{g.title}</h2>
                        <p className="text-xs text-slate-400">
                          {g.period} · {g.progress}/{g.targetUnits} {g.unitType}
                        </p>
                      </div>
                      <button onClick={() => removeGoal(g.id)} className="text-slate-500 hover:text-rose-300 transition" aria-label={`Delete goal ${g.title}`}>
                        ✕
                      </button>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-gradient-to-r from-aqua-400 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateGoal(g, g.progress - 10)} className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition">−10</button>
                      <span className="text-xs text-slate-400 font-bold">{g.progress}</span>
                      <button onClick={() => updateGoal(g, g.progress + 10)} className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition">+10</button>
                      {pct >= 100 && <span className="ml-auto text-xs text-emerald-300 font-bold">Done! 🎉</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={addGoal} className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">New goal</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Title</label>
                <input type="text" required minLength={2} maxLength={200} value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} className={inputCls} placeholder="e.g. Study physics every day" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Period</label>
                <select value={goalForm.period} onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })} className={inputCls}>
                  <option value="daily" className="bg-slate-900">Daily</option>
                  <option value="weekly" className="bg-slate-900">Weekly</option>
                  <option value="monthly" className="bg-slate-900">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Target</label>
                <input type="number" required min={1} max={100000} value={goalForm.targetUnits} onChange={(e) => setGoalForm({ ...goalForm, targetUnits: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <button disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition">
              {busy ? 'Adding…' : 'Create goal'}
            </button>
          </form>
        </>
      )}

      {tab === 'exams' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {exams.upcoming?.length === 0 && (
              <div className="glass rounded-2xl p-10 text-center md:col-span-2">
                <p className="text-slate-300">No upcoming exams — add one so you never miss a date.</p>
              </div>
            )}
            {exams.upcoming?.map((ex) => (
              <div key={ex.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white text-sm">{ex.title}</h2>
                    <p className="text-xs text-slate-400">
                      {new Date(ex.examDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {ex.subject && <span> · {ex.subject.name}</span>}
                    </p>
                    {ex.notes && <p className="text-xs text-slate-500 mt-1">{ex.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-full ${ex.daysUntil <= 3 ? 'bg-rose-400/15 text-rose-300' : 'bg-amber-400/15 text-amber-300'}`}>
                      {ex.daysUntil === 0 ? 'Today!' : `${ex.daysUntil} day${ex.daysUntil === 1 ? '' : 's'}`}
                    </span>
                    <button onClick={() => removeExam(ex.id)} className="block ml-auto mt-2 text-slate-500 hover:text-rose-300 transition text-xs" aria-label={`Delete exam ${ex.title}`}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {exams.past?.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Past exams</h2>
              <div className="space-y-2">
                {exams.past.map((ex) => (
                  <div key={ex.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-400">{ex.title}</span>
                    <span className="text-xs text-slate-500">{new Date(ex.examDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={addExam} className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">Add an exam</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Title</label>
                <input type="text" required minLength={2} maxLength={200} value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} className={inputCls} placeholder="e.g. Mid-term Physics" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" required value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                <input type="text" maxLength={2000} value={examForm.notes} onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })} className={inputCls} />
              </div>
            </div>
            <button disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition">
              {busy ? 'Adding…' : 'Add exam'}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        Plan items also trigger reminders — keep an eye on your{' '}
        <Link to="/notifications" className="text-aqua-300 hover:text-aqua-100">notifications</Link>.
      </p>
    </div>
  );
}
