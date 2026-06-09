import { useState, useEffect } from 'react';
import '../style/HistoryPage.css';
import logoImg from '../assets/logo.png';
import { getUser } from '../auth';
import { fetchUserHistory, deleteHistoryItem } from '../historyService';
import { supabase } from '../supabaseClient';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

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
  aiResultJson?: any;
};

const STORAGE_KEY = 'skinmate_scan_history';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}

function getSkincareTips(item: ScanHistoryItem): string[] {
  const skin = item.skinType.toUpperCase();
  const comedo = item.aiResultJson?.zones?.filter((z: any) => !z.is_inflamed).reduce((sum: number, z: any) => sum + z.count, 0) || 0;
  const inflamed = item.aiResultJson?.zones?.filter((z: any) => z.is_inflamed).reduce((sum: number, z: any) => sum + z.count, 0) || 0;
  
  const hasInflamed = inflamed > 0;
  const isSevere = inflamed >= 10;
  const hasComedo = comedo > 0;

  const tips: string[] = [];

  if (skin === 'OILY') {
    tips.push('Use a gentle foaming cleanser with 2% Salicylic Acid (BHA) to unclog pores and control excess oil production.');
  } else if (skin === 'DRY') {
    tips.push('Opt for a hydrating, non-foaming cleanser containing Ceramides or Hyaluronic Acid. Avoid cleansers that leave skin feeling tight.');
  } else {
    tips.push('Use a gentle, pH-balanced cleanser twice daily to maintain a healthy skin barrier.');
  }

  if (isSevere) {
    tips.push('For severe inflamed acne (nodules/cysts), it is strongly recommended to consult a dermatologist for a prescription of topical/oral antibiotics or medical-grade retinoids.');
    tips.push('Apply an acne spot treatment with 2.5% Benzoyl Peroxide or Sulfur only on active breakout areas.');
  } else if (hasInflamed) {
    tips.push('For inflamed acne (papules/pustules), apply Centella Asiatica extract or Niacinamide (max 5%) to soothe redness and calm irritation.');
    tips.push('Use an acne spot treatment such as 2.5% Benzoyl Peroxide or Tea Tree Oil directly on actively inflamed blemishes.');
  } else if (hasComedo) {
    tips.push('Use a gentle chemical exfoliant with BHA (Salicylic Acid) 1–2 times per week to clear out blackheads and whiteheads.');
  }

  if (skin === 'OILY' || skin === 'NORMAL') {
    tips.push('Always use a lightweight, water-based gel moisturizer to keep skin hydrated without clogging pores.');
  } else if (skin === 'DRY') {
    tips.push('Use a rich, ceramide-based cream moisturizer to lock in hydration and strengthen the skin barrier.');
  }

  tips.push('Apply a non-comedogenic SPF 30+ sunscreen every morning — active acne ingredients increase skin sensitivity to UV rays.');

  return tips;
}

function getAcneCount(item: ScanHistoryItem) {
    const anyH = item as any;
    if (anyH.aiResultJson && Array.isArray(anyH.aiResultJson.acne_detections)) {
        return anyH.aiResultJson.acne_detections.length;
    }
    const match = (item.acneType || '').match(/\d+/);
    if (match) return parseInt(match[0], 10);
    let hash = 0;
    const str = item.id || '';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 60;
}

function DetailPage({
  item,
  onBack,
  onDelete
}: {
  item: ScanHistoryItem;
  onBack: () => void;
  onDelete?: (id: string) => void;
}) {

  return (
    <div className="detail-page">
      <nav className="detail-nav">
        <button type="button" className="detail-back-btn" onClick={onBack}>
          ← Back to History
        </button>
        <div className="detail-nav-date">{formatDate(item.date)}</div>
      </nav>

      <main className="detail-shell">
        {item.isDemo && (
          <div className="detail-demo-banner">
            <span className="detail-demo-tag">Demo Data</span>
            This is sample data. Connect AI for actual analysis results.
          </div>
        )}

        <div className="detail-split">
          <div className="detail-image-panel">
            <div className="detail-image-wrap">
              <img src={item.image} alt="Detail scan" className="detail-big-photo" />
            </div>
            {!item.isDemo ? (
              <p className="detail-accuracy-label">🎯 Average accuracy: <strong>{item.confidence}%</strong></p>
            ) : (
              <p className="detail-accuracy-label detail-demo-acc">✨ Sample data</p>
            )}
          </div>

          <div className="detail-info-panel">
            <div className="detail-cards-stacked">
              <div className="detail-card skin-card">
                <div className="dc-icon">🌿</div>
                <div className="dc-label">Skin Type</div>
                <div className="dc-value" style={{ marginTop: '4px' }}>
                  <span style={{
                    background: item.skinType.toUpperCase() === 'DRY' ? '#e6f4ff' : item.skinType.toUpperCase() === 'OILY' ? '#fefce8' : '#fff',
                    color: item.skinType.toUpperCase() === 'DRY' ? '#0958d9' : item.skinType.toUpperCase() === 'OILY' ? '#b45309' : '#2b2b1f',
                    border: '1px solid ' + (item.skinType.toUpperCase() === 'DRY' ? '#91caff' : item.skinType.toUpperCase() === 'OILY' ? '#fde68a' : '#d6d2c4'),
                    padding: '4px 16px',
                    borderRadius: '999px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    letterSpacing: '1px'
                  }}>
                    {item.skinType.toUpperCase()}
                  </span>
                </div>
                <p className="dc-desc" style={{ marginTop: '12px' }}>{item.skinTypeDesc}</p>
              </div>
              <div className="detail-card acne-card">
                <div className="dc-icon">🔍</div>
                <div className="dc-label">Acne Detail</div>
                <div className="dc-value">{(item as any).aiResultJson?.acne_detections?.length ?? 0} Total Acne</div>
                <div className="dc-desc" style={{ marginTop: '8px', lineHeight: '1.6', fontSize: '0.85rem' }}>
                  Comedo: <strong>{(item as any).aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Tidak Meradang').length ?? 0}</strong><br/>
                  Inflamed: <strong>{(item as any).aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Meradang').length ?? 0}</strong><br/>
                  Severe: <strong>{(item as any).aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Meradang Parah').length ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {getSkincareTips(item).length > 0 && (
          <div className="detail-tips">
            <h3>💡 Skincare Tips for You</h3>
            <ul className="detail-tips-list">
              {getSkincareTips(item).map((tip, i) => (
                <li key={i}>
                  <span className="tip-num">{i + 1}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="detail-disclaimer">
          ⚕️ This result is only an{item.isDemo ? ' example' : ' AI'} estimation, not a medical diagnosis. Consult a dermatologist for an accurate diagnosis.
        </p>

        <div className="detail-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-back-action" 
            onClick={onBack}
            style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #d6d2c4', borderRadius: '999px', fontWeight: 600, color: '#6b6b55', cursor: 'pointer' }}
          >
            Back
          </button>
          <button 
            type="button" 
            onClick={() => {
              const ok = confirm("Are you sure you want to delete this scan from history?");
              if (ok && onDelete) {
                onDelete(item.id);
              }
            }}
            style={{ flex: 1, padding: '12px', background: '#dc2626', border: 'none', borderRadius: '999px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            Delete History
          </button>
        </div>
      </main>
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setCurrentUser] = useState<{ username: string } | null>(null);
  const [detailItem, setDetailItem] = useState<ScanHistoryItem | null>(null);

  useEffect(() => {
    setCurrentUser(getUser());
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const user = getUser();
    if (user?.id) {
      // Fetch from Supabase if logged in
      const data = await fetchUserHistory();
      setHistory(data);
      // Also sync to localStorage for offline/other pages
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setHistory(raw ? JSON.parse(raw) : []);
      } catch { setHistory([]); }
    }
    setLoading(false);
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [detailItem]);

  async function clearHistory() {
    const ok = confirm('Are you sure you want to delete all scan history?');
    if (!ok) return;
    const user = getUser();
    if (user?.id) {
      await supabase.from('scan_history').delete().eq('user_id', user.id);
    }
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }

  async function deleteItem(id: string) {
    await deleteHistoryItem(id);
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    setDetailItem(null);
  }

  if (detailItem) {
    return (
      <DetailPage
        item={detailItem}
        onBack={() => setDetailItem(null)}
        onDelete={deleteItem}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#918b6b', fontSize: '1.1rem' }}>
        <span style={{ marginRight: '10px' }}>⏳</span> Loading your history...
      </div>
    );
  }

  return (
    <div className="history-page">
      <nav className="history-nav">
        <a className="history-logo" href={user ? '/home' : '/'}>
          <img src={logoImg} alt="Logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </a>
        <div className="history-nav-actions">
          <a href="/dashboard">Dashboard</a>
          <a href="/scan">Analyze Skin</a>
          <a href="/history" className="nav-active">Scan History</a>
          <a href="/progress">Progress Tracker</a>
        </div>
        <a href="/profile" className="history-nav-avatar" title="Profile">
          <span className="history-avatar-circle">{user ? getInitials(user.username) : '👤'}</span>
        </a>
      </nav>

      <main className="history-shell">
        <header className="history-header">
          <div className="header-text-center">
            <p>Scan History</p>
            <h1>Monitor your skin progress</h1>
            <span>Click a card to see details.</span>
          </div>
          

        </header>


        {history.length === 0 ? (
          <section className="history-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #d6d2c4' }}>
            <strong style={{ fontSize: '3rem', marginBottom: '25px' }}>📸</strong>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>No history yet</h2>
            <p style={{ color: '#6b6b55', margin: '0 0 20px' }}>After scanning, the results are automatically saved on this page.</p>
            <a href="/scan" style={{ display: 'inline-block', padding: '10px 24px', background: '#918b6b', color: '#fff', borderRadius: '999px', textDecoration: 'none', fontWeight: 700 }}>Start Scan</a>
          </section>
        ) : (
          <section className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => {
              return (
                <article
                  className="history-row"
                  key={item.id}
                  onClick={() => setDetailItem(item)}
                  style={{ display: 'flex', gap: '20px', background: '#fff', border: '1px solid #d6d2c4', borderRadius: '16px', padding: '16px', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
                >
                  {item.isDemo && <div className="demo-badge" style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', zIndex: 2 }}>Demo</div>}
                  
                  <img src={item.image} alt="History scan" style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '12px', background: '#ede9e0' }} />
                  
                  <div className="history-row-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{
                          background: (item.skinType || '').toUpperCase() === 'DRY' ? '#e6f4ff' : (item.skinType || '').toUpperCase() === 'OILY' ? '#fefce8' : (item.skinType || '').toUpperCase() === 'NORMAL' ? '#f0fdf4' : '#fff',
                          color: (item.skinType || '').toUpperCase() === 'DRY' ? '#0958d9' : (item.skinType || '').toUpperCase() === 'OILY' ? '#b45309' : (item.skinType || '').toUpperCase() === 'NORMAL' ? '#15803d' : '#2b2b1f',
                          border: '1px solid ' + ((item.skinType || '').toUpperCase() === 'DRY' ? '#91caff' : (item.skinType || '').toUpperCase() === 'OILY' ? '#fde68a' : (item.skinType || '').toUpperCase() === 'NORMAL' ? '#86efac' : '#d6d2c4'),
                          padding: '4px 14px',
                          borderRadius: '999px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          letterSpacing: '1px',
                          fontFamily: "'DM Sans', system-ui, sans-serif"
                      }}>
                          {(item.skinType || 'UNKNOWN').toUpperCase()}
                      </span>
                      <span style={{ color: '#9e9e80', fontSize: '0.85rem' }}>{timeAgo(item.date)}</span>
                  </div>
                    <p style={{ margin: '0 0 12px 0', color: '#6b6b55', fontSize: '0.95rem', fontWeight: 500 }}>
                      Total Acne: <strong>{getAcneCount(item)}</strong>
                    </p>
                    <span className="history-date" style={{ color: '#918b6b', fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(item.date)}</span>
                  </div>
                </article>
              );
            })}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn-clear-history" onClick={clearHistory}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Clear History
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
