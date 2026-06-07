import { useEffect, useState } from 'react';
import logoImg from '../assets/logo.png';
import { getUser, type AuthUser } from '../auth';
import { supabase } from '../supabaseClient';
import { fetchUserHistory } from '../historyService';
import '../style/ProfilePage.css';

type ScanHistoryItem = {
  id: string;
  skinType: string;
  acneType: string;
  overallCondition: string;
  confidence: number;
  date: string;
};



function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) {
      window.location.href = '/auth/login';
      return;
    }
    setUser(u);
    setEditName(u.username);
    // Load from Supabase if logged in
    if (u.id) {
      fetchUserHistory().then(data => {
        setHistory(data);
        setLoaded(true);
      });
    } else {
      setHistory((() => {
        try {
          const raw = localStorage.getItem('skinmate_scan_history');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })());
      setLoaded(true);
    }
  }, []);

  async function handleLogout() {
    const ok = confirm('Are you sure you want to logout?');
    if (!ok) return;
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function handleSaveName() {
    if (!user || !editName.trim()) return;
    const updated = { ...user, username: editName.trim() };
    import('../auth').then(({ setUser: saveUser }) => {
      saveUser(updated);
      setUser(updated);
      setEditing(false);
    });
  }



  const totalScans = history.length;
  const avgConf =
    totalScans > 0
      ? Math.round(history.reduce((s, h) => s + (h.confidence || 0), 0) / totalScans)
      : 0;

  const skinTypeCounts = history.reduce<Record<string, number>>((acc, h) => {
    acc[h.skinType] = (acc[h.skinType] || 0) + 1;
    return acc;
  }, {});
  const topSkin = Object.entries(skinTypeCounts).sort((a, b) => b[1] - a[1])[0];


  if (!loaded) return null;

  return (
    <div className={`profile-page${loaded ? ' loaded' : ''}`}>
      {/* ── Nav ── */}
      <nav className="profile-nav">
        <a className="profile-nav-logo" href={user ? "/home" : "/"}>
          <img src={logoImg} alt="Logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </a>
        <div className="profile-nav-links">
          <a href="/dashboard">Dashboard</a>
          <a href="/scan">Analyze Skin</a>
          <a href="/history">Scan History</a>
          <a href="/progress">Progress Tracker</a>
        </div>
        <a href="/profile" className="active profile-nav-avatar" title="Profile">
          <span className="nav-avatar-circle">{user ? getInitials(user.username) : '?'}</span>
        </a>
      </nav>

      <main className="profile-main">
        {/* ── Header Card ── */}
        <div className="profile-hero-card">
          <div className="profile-avatar-big">
            {user ? getInitials(user.username) : '?'}
          </div>
          <div className="profile-hero-info">
            {editing ? (
              <div className="profile-edit-row">
                <input
                  className="profile-edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                />
                <button className="profile-btn-save" onClick={handleSaveName}>Save</button>
                <button className="profile-btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <div className="profile-name-row">
                <h1>{user?.username}</h1>
                <button className="profile-btn-edit" onClick={() => setEditing(true)} title="Edit name">
                  ✏️
                </button>
              </div>
            )}
            <p className="profile-email">{user?.email}</p>
            <p className="profile-joined">
              Joined since {user ? formatDate(user.joinedAt) : '-'}
            </p>
          </div>
          <button className="profile-btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* ── Stats Grid ── */}
        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <span className="pstat-icon">📸</span>
            <div className="pstat-num">{totalScans}</div>
            <div className="pstat-label">Total Scan</div>
          </div>
          <div className="profile-stat-card">
            <span className="pstat-icon">🎯</span>
            <div className="pstat-num">{avgConf}%</div>
            <div className="pstat-label">Average Accuracy</div>
          </div>
          <div className="profile-stat-card">
            <span className="pstat-icon">🌿</span>
            <div className="pstat-num">{topSkin?.[0] ?? '-'}</div>
            <div className="pstat-label">Dominant Skin Type</div>
          </div>
        </div>



        {/* ── Skin Type Breakdown ── */}
        {totalScans > 0 && (
          <div className="profile-section-card">
            <h2>Skin Type Distribution</h2>
            <div className="profile-skintype-grid">
              {Object.entries(skinTypeCounts).map(([type, count]) => (
                <div key={type} className="profile-skintype-chip">
                  <div className="pchip-count">{count}</div>
                  <div className="pchip-label">{type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {totalScans === 0 && (
          <div className="profile-empty">
            <span>📊</span>
            <h3>No scan data yet</h3>
            <p>Start a scan to see your skin statistics here.</p>
            <a href="/scan" className="profile-cta">Start Scan</a>
          </div>
        )}
      </main>
    </div>
  );
}
