import { useState, useEffect, useMemo } from 'react';
import '../style/ProgressPage.css';
import logoImg from '../assets/logo.png';
import { getUser } from '../auth';
import { fetchUserHistory } from '../historyService';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

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
};



function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr} at ${timeStr}`;
}

function getAcneCount(h: ScanHistoryItem) {
    const anyH = h as any;
    if (anyH.aiResultJson && Array.isArray(anyH.aiResultJson.acne_detections)) {
        return anyH.aiResultJson.acne_detections.length;
    }
    const match = (h.acneType || '').match(/\d+/);
    if (match) return parseInt(match[0], 10);
    let hash = 0;
    const str = h.id || '';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 60;
}

function getAcneDetail(h: ScanHistoryItem | undefined) {
    if (!h) return { total: 0, comedo: 0, inflamed: 0, severe: 0 };
    const anyH = h as any;
    if (anyH.aiResultJson && Array.isArray(anyH.aiResultJson.acne_detections)) {
        const detections = anyH.aiResultJson.acne_detections;
        return {
            total: detections.length,
            comedo: detections.filter((a: any) => a.category === 'Tidak Meradang').length,
            inflamed: detections.filter((a: any) => a.category === 'Meradang').length,
            severe: detections.filter((a: any) => a.category === 'Meradang Parah').length
        };
    }
    return {
        total: getAcneCount(h),
        comedo: 0,
        inflamed: 0,
        severe: 0
    };
}

export default function ProgressPage() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [user, setCurrentUser] = useState<{ username: string } | null>(null);
  const [leftCompareId, setLeftCompareId] = useState<string>('');
  const [rightCompareId, setRightCompareId] = useState<string>('');

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    if (u?.id) {
      fetchUserHistory().then(data => {
        setHistory(data);
        localStorage.setItem('skinmate_scan_history', JSON.stringify(data));
        if (data.length > 0) {
          setLeftCompareId(data[data.length - 1].id);
          setRightCompareId(data[0].id);
        }
      });
    } else {
      const data = (() => {
        try {
          const raw = localStorage.getItem('skinmate_scan_history');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();
      setHistory(data);
      if (data.length > 0) {
        setLeftCompareId(data[data.length - 1].id);
        setRightCompareId(data[0].id);
      }
    }
  }, []);

  const chartData = useMemo(() => {
    return [...history].reverse().map(item => ({
      date: formatDate(item.date),
      acneCount: getAcneCount(item),
      overall: item.overallCondition
    }));
  }, [history]);

  const leftItem = history.find(h => h.id === leftCompareId);
  const rightItem = history.find(h => h.id === rightCompareId);

  return (
    <div className="progress-page">
      <nav className="progress-nav">
        <a className="progress-logo" href={user ? '/home' : '/'}>
          <img src={logoImg} alt="Logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </a>
        <div className="progress-nav-actions">
          <a href="/dashboard">Dashboard</a>
          <a href="/scan">Analyze Skin</a>
          <a href="/history">Scan History</a>
          <a href="/progress" className="nav-active">Progress Tracker</a>
        </div>
        <a href="/profile" className="progress-nav-avatar" title="Profile">
          <span className="progress-avatar-circle">
            {user ? getInitials(user.username) : '👤'}
          </span>
        </a>
      </nav>

      <main className="progress-shell">
        <header className="progress-header">
          <p>Progress Tracker</p>
          <h1>Track your skin condition over time</h1>
          <span>Monitor lesion counts and visually compare your progress.</span>
        </header>

        {history.length === 0 ? (
          <section className="progress-empty">
            <strong>📈</strong>
            <h2>No progress data yet</h2>
            <p>Complete at least one scan to start tracking your skin progress.</p>
            <a href="/scan">Start Scan</a>
          </section>
        ) : (
          <div className="progress-content">
            {/* Timeline Chart Section */}
            <section className="progress-card timeline-chart">
                <h2>Skin Lesion Timeline</h2>
                <p className="card-subtitle">Your acne and lesion count tracked across all scans.</p>
                
                <div className="chart-container" style={{ height: 350, marginTop: '30px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAcne" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#918b6b" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#918b6b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e3db" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b6b55', fontSize: 12 }} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b6b55', fontSize: 12 }} 
                                dx={-10} 
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: '1px solid #d6d2c4', backgroundColor: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                                labelStyle={{ fontWeight: 700, color: '#2b2b1f', marginBottom: '4px' }}
                                itemStyle={{ color: '#5e5e3a', fontSize: '0.9rem' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="acneCount" 
                                name="Acne Count" 
                                stroke="#918b6b" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorAcne)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Visual Comparison Section */}
            <section className="progress-card visual-comparison">
                <h2>Visual Skin Comparison</h2>
                <p className="card-subtitle">Select two dates to visually compare the changes in your skin.</p>
                
                <div className="compare-container">
                    {/* Left Item */}
                    <div className="compare-side">
                        <select 
                            className="compare-select" 
                            value={leftCompareId} 
                            onChange={(e) => setLeftCompareId(e.target.value)}
                        >
                            {history.map(h => (
                                <option key={h.id} value={h.id}>{formatDateTime(h.date)}</option>
                            ))}
                        </select>
                        <div className="compare-image-box">
                            {leftItem ? (
                                <>
                                    <img src={leftItem.image} alt="Left scan" />
                                </>
                            ) : (
                                <div className="compare-placeholder">Select a scan</div>
                            )}
                        </div>
                    </div>

                    <div className="compare-divider">
                        <span>VS</span>
                    </div>

                    {/* Right Item */}
                    <div className="compare-side">
                        <select 
                            className="compare-select" 
                            value={rightCompareId} 
                            onChange={(e) => setRightCompareId(e.target.value)}
                        >
                            {history.map(h => (
                                <option key={h.id} value={h.id}>{formatDateTime(h.date)}</option>
                            ))}
                        </select>
                        <div className="compare-image-box">
                            {rightItem ? (
                                <>
                                    <img src={rightItem.image} alt="Right scan" />
                                </>
                            ) : (
                                <div className="compare-placeholder">Select a scan</div>
                            )}
                        </div>
                    </div>
                </div>

                {leftItem && rightItem && (
                    <div className="compare-table-wrapper" style={{ marginTop: '30px', background: '#fff', borderRadius: '16px', border: '1px solid #d6d2c4', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#f5f2ec', borderBottom: '1px solid #d6d2c4' }}>
                                    <th style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Metric</th>
                                    <th style={{ padding: '16px', color: '#2b2b1f', fontWeight: 700 }}>Comparison A (Left)</th>
                                    <th style={{ padding: '16px', color: '#2b2b1f', fontWeight: 700 }}>Comparison B (Right)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #e5e3db' }}>
                                    <td style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Skin Type</td>
                                    
                                    {/* Kolom Kiri (Baseline A) */}
                                    <td style={{ padding: '16px', fontWeight: 500 }}>
                                        <span style={{
                                            background: leftItem.skinType.toUpperCase() === 'DRY' ? '#e6f4ff' : leftItem.skinType.toUpperCase() === 'OILY' ? '#fefce8' : leftItem.skinType.toUpperCase() === 'NORMAL' ? '#f0fdf4' : '#fff',
                                            color: leftItem.skinType.toUpperCase() === 'DRY' ? '#0958d9' : leftItem.skinType.toUpperCase() === 'OILY' ? '#b45309' : leftItem.skinType.toUpperCase() === 'NORMAL' ? '#15803d' : '#2b2b1f',
                                            border: '1px solid ' + (leftItem.skinType.toUpperCase() === 'DRY' ? '#91caff' : leftItem.skinType.toUpperCase() === 'OILY' ? '#fde68a' : leftItem.skinType.toUpperCase() === 'NORMAL' ? '#86efac' : '#d6d2c4'),
                                            padding: '4px 14px',
                                            borderRadius: '999px',
                                            fontSize: '0.85rem',
                                            fontWeight: 800,
                                            letterSpacing: '1px',
                                            fontFamily: "'DM Sans', system-ui, sans-serif"
                                        }}>
                                            {leftItem.skinType.toUpperCase()}
                                        </span>
                                    </td>

                                    {/* Kolom Kanan (Comparison B) */}
                                    <td style={{ padding: '16px', fontWeight: 500 }}>
                                        <span style={{
                                            background: rightItem.skinType.toUpperCase() === 'DRY' ? '#e6f4ff' : rightItem.skinType.toUpperCase() === 'OILY' ? '#fefce8' : rightItem.skinType.toUpperCase() === 'NORMAL' ? '#f0fdf4' : '#fff',
                                            color: rightItem.skinType.toUpperCase() === 'DRY' ? '#0958d9' : rightItem.skinType.toUpperCase() === 'OILY' ? '#b45309' : rightItem.skinType.toUpperCase() === 'NORMAL' ? '#15803d' : '#2b2b1f',
                                            border: '1px solid ' + (rightItem.skinType.toUpperCase() === 'DRY' ? '#91caff' : rightItem.skinType.toUpperCase() === 'OILY' ? '#fde68a' : rightItem.skinType.toUpperCase() === 'NORMAL' ? '#86efac' : '#d6d2c4'),
                                            padding: '4px 14px',
                                            borderRadius: '999px',
                                            fontSize: '0.85rem',
                                            fontWeight: 800,
                                            letterSpacing: '1px',
                                            fontFamily: "'DM Sans', system-ui, sans-serif"
                                        }}>
                                            {rightItem.skinType.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e5e3db' }}>
                                    <td style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Total Acne</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(leftItem).total}</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(rightItem).total}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e5e3db' }}>
                                    <td style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Comedo</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(leftItem).comedo}</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(rightItem).comedo}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e5e3db' }}>
                                    <td style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Inflamed</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(leftItem).inflamed}</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(rightItem).inflamed}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '16px', color: '#6b6b55', fontWeight: 600 }}>Severe</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(leftItem).severe}</td>
                                    <td style={{ padding: '16px', fontWeight: 500, color: '#2b2b1f' }}>{getAcneDetail(rightItem).severe}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
