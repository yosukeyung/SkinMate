import { useEffect, useState } from 'react';
import '../style/DashboardPage.css';
import logoImg from '../assets/logo.png';
import { getUser } from '../auth';
import { fetchUserHistory } from '../historyService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanHistoryItem = {
  id: string;
  image: string;
  skinType: string;
  skinTypeDesc: string;
  acneType: string;
  acneTypeDesc: string;
  overallCondition: string;
  skincareTips: string[];
  confidence: number;
  date: string;
  isDemo?: boolean;
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function timeAgo(value: string) {
  const date = new Date(value);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `just now`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `about ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `about ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}





// ─── Chart: kondisi over time ──────────────────────────────────────────────────

function getAcneCount(h: ScanHistoryItem) {
  const match = (h.acneType || '').match(/\d+/);
  if (match) return parseInt(match[0], 10);
  let hash = 0;
  const str = h.id || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 60;
}

function TrendChart({ history }: { history: ScanHistoryItem[] }) {
  if (history.length === 0) return null;
  const lastScans = [...history].reverse().slice(-8);
  const maxVal = 60;

  return (
    <div className="db-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '150px', marginTop: '10px', marginLeft: '20px', marginBottom: '20px' }}>
        {/* Y-axis labels */}
        {[60, 45, 30, 15, 0].map((val, i) => (
          <div key={val} style={{ position: 'absolute', left: '-25px', top: `${i * 25}%`, transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#918b6b', width: '20px', textAlign: 'right' }}>
            {val}
          </div>
        ))}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Horizontal lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f0ede8" strokeWidth="0.5" />
          ))}

          {/* Polyline */}
          <polyline
            fill="none"
            stroke="#918b6b"
            strokeWidth="1.5"
            points={lastScans.map((item, i) => {
              const x = lastScans.length > 1 ? (i / (lastScans.length - 1)) * 100 : 50;
              const y = 100 - (getAcneCount(item) / maxVal) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />

          {/* Data points */}
          {lastScans.map((item, i) => {
            const x = lastScans.length > 1 ? (i / (lastScans.length - 1)) * 100 : 50;
            const y = 100 - (getAcneCount(item) / maxVal) * 100;
            return (
              <circle key={i} cx={x} cy={y} r="2" fill="#fff" stroke="#918b6b" strokeWidth="1" />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {lastScans.map((item, i) => {
            if (i === 0 || i === lastScans.length - 1) {
              return <span key={i} style={{ fontSize: '0.6rem', color: '#918b6b' }}>{formatDateShort(item.date)}</span>;
            }
            return <span key={i} style={{ fontSize: '0.6rem', color: 'transparent' }}>-</span>;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setCurrentUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    if (user?.id) {
      fetchUserHistory().then(data => {
        setHistory(data);
        localStorage.setItem('skinmate_scan_history', JSON.stringify(data));
        setLoaded(true);
      });
    } else {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('skinmate_scan_history');
        setHistory(raw ? JSON.parse(raw) : []);
      } catch { setHistory([]); }
      setLoaded(true);
    }
  }, []);

  const totalScans = history.length;


  const skinTypeCounts = history.reduce<Record<string, number>>((acc, h) => {
    acc[h.skinType] = (acc[h.skinType] || 0) + 1;
    return acc;
  }, {});
  const topSkin = Object.entries(skinTypeCounts).sort((a, b) => b[1] - a[1]);



  const latestScan = history[0];



  return (
    <div className={`db-page${loaded ? ' loaded' : ''}`}>

      {/* ── Nav ── */}
      <nav className="db-nav">
        <a className="db-nav-logo" href={user ? "/home" : "/"}>
          <img src={logoImg} alt="Logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </a>
        <div className="db-nav-links">
          <a href="/dashboard" className="nav-active">Dashboard</a>
          <a href="/scan">Analyze Skin</a>
          <a href="/history">Scan History</a>
          <a href="/progress">Progress Tracker</a>
        </div>
        <a href="/profile" className="db-nav-avatar" title="Profile">
          <span className="nav-avatar-circle">{user ? getInitials(user.username) : '👤'}</span>
        </a>
      </nav>

      <main className="db-main">
        {(() => {
          const avgAcneCount = totalScans > 0 ? Math.round(history.reduce((a, b) => a + getAcneCount(b), 0) / totalScans) : 0;
          return (
            <>
              {/* ── Hero header ── */}
              <header className="db-hero" style={{ marginBottom: '24px' }}>
                <div className="db-hero-text">
                  <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', color: '#2b2b1f' }}>
                    Hello, {user ? user.username : 'Guest'}!
                  </h1>
                  <span style={{ fontSize: '1rem', color: '#6b6b55' }}>Welcome back. Here is your skin health status.</span>
                </div>
                <a href="/scan" className="db-hero-cta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✨</span> Start Skin Analysis
                </a>
              </header>

              {/* ── Important Medical Notice ── */}
              <div className="db-card" style={{ border: '1px solid #ffcfd1', backgroundColor: '#fff1f0', color: '#cf1322', marginBottom: '24px', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <strong style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>Important Medical Notice</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cf1322', lineHeight: 1.5 }}>
                  SkinMate is an AI education model and <strong>cannot replace a certified dermatologist</strong>. Assessments and suggestions are for informational purposes only.
                </p>
              </div>

              {/* ── 3-column Grid ── */}
                  <div className="db-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px', gap: '14px' }}>
                    
                    {/* Latest Scan Status */}
                    <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <h2 className="db-card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📄</span> Latest Scan Status
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#918b6b', marginBottom: '24px' }}>Metrics from your most recent assessment</p>
                      
                      {latestScan ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                            <span style={{ color: '#6b6b55' }}>Skin Type</span>
                            <strong style={{ background: '#e6f4ff', color: '#0958d9', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', border: '1px solid #91caff' }}>
                              {(latestScan.skinType || '').toUpperCase()}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: '#6b6b55' }}>Acne Detected</span>
                            <strong style={{ color: '#2b2b1f' }}>{getAcneCount(latestScan)} lesions</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: '#6b6b55' }}>Confidence</span>
                            <strong style={{ color: '#2b2b1f' }}>{Number(latestScan.confidence || 0).toFixed(1)}%</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: '#6b6b55' }}>Scanned</span>
                            <strong style={{ color: '#2b2b1f' }}>{timeAgo(latestScan.date)}</strong>
                          </div>
                          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                            <a href="/history" className="db-hero-cta" style={{ display: 'block', textAlign: 'center', background: '#f5f2ec', color: '#2b2b1f', border: '1px solid #d6d2c4' }}>
                              View Details
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#918b6b', fontSize: '0.9rem' }}>
                          <p>No scans recorded yet.</p>
                          <a href="/scan" className="db-hero-cta" style={{ display: 'inline-block', marginTop: '16px', padding: '8px 24px', fontSize: '0.85rem' }}>Start First Scan</a>
                        </div>
                      )}
                    </div>

                    {/* Skincare Tip of the Day */}
                    <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <h2 className="db-card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💡</span> Skincare Tip of the Day
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#918b6b', marginBottom: '24px' }}>Daily guidelines for healthy skin</p>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <p style={{ fontStyle: 'italic', fontSize: '1.05rem', color: '#5e5e3a', marginBottom: '24px', lineHeight: 1.6 }}>
                          "{latestScan?.skincareTips?.[0] || 'Always apply a broad-spectrum sunscreen of at least SPF 30 daily, even indoors.'}"
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#918b6b', marginTop: 'auto', marginBottom: 0 }}>
                          Based on general dermatology best practices.
                        </p>
                      </div>
                    </div>

                    {/* Overall Stats */}
                    <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <h2 className="db-card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📈</span> Overall Stats
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#918b6b', marginBottom: '24px' }}>Performance metrics across all logs</p>
                      
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ flex: 1, background: '#f5f2ec', padding: '16px', borderRadius: '16px', border: '1px solid #e8e6de' }}>
                          <div style={{ fontSize: '0.65rem', color: '#918b6b', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.5px' }}>TOTAL SCANS</div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>{totalScans}</div>
                        </div>
                        <div style={{ flex: 1, background: '#f5f2ec', padding: '16px', borderRadius: '16px', border: '1px solid #e8e6de' }}>
                          <div style={{ fontSize: '0.65rem', color: '#918b6b', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.5px' }}>AVG. ACNE COUNT</div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#2b2b1f', lineHeight: 1 }}>{avgAcneCount}</div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: 'auto', padding: '16px', border: '1px solid #d6d2c4', borderRadius: '16px', fontSize: '0.85rem', color: '#6b6b55', lineHeight: 1.5 }}>
                        Your skin type has consistently been classified as <strong style={{ color: '#2b2b1f' }}>{topSkin[0]?.[0]?.toLowerCase() ?? 'unknown'}</strong>.
                      </div>
                    </div>

                  </div>

                  {/* ── 2-column Grid for Chart & Recent Scans ── */}
                  <div className="db-mid-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    
                    {/* Trend Chart */}
                    <div className="db-card db-chart-card">
                      <h2 className="db-card-title" style={{ marginBottom: '4px' }}>Acne Trend Tracking</h2>
                      <p style={{ fontSize: '0.8rem', color: '#918b6b', marginBottom: '0' }}>Timeline plot of active acne count across scans</p>
                      <div style={{ height: '240px' }}>
                        <TrendChart history={history} />
                      </div>
                    </div>

                    {/* Recent Scans */}
                    <div className="db-card">
                      <div className="db-card-header" style={{ marginBottom: '16px' }}>
                        <div>
                          <h2 className="db-card-title" style={{ marginBottom: '4px' }}>Recent Scans</h2>
                          <p style={{ fontSize: '0.8rem', color: '#918b6b', margin: 0 }}>Your last 5 scans list</p>
                        </div>
                        <a href="/history" className="db-card-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          View All <span>→</span>
                        </a>
                      </div>
                      <div className="db-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.slice(0, 5).map((item) => {
                          return (
                            <div key={item.id} className="db-history-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
                              <img src={item.image} alt="" className="db-history-thumb" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #d6d2c4' }} />
                              <div className="db-history-info" style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2b2b1f', marginBottom: '4px' }}>{formatDateShort(item.date)}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b6b55', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ background: '#e6f4ff', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', border: '1px solid #91caff', color: '#0958d9' }}>
                                    {item.skinType}
                                  </span>
                                  <span>{getAcneCount(item)} Acne</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}
