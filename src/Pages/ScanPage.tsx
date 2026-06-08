import { useEffect, useRef, useState } from 'react';
import '../style/ScanPage.css';
import logoImg from '../assets/logo.png';
import { getUser } from '../auth';
import { BACKEND_URL } from '../api';
import { supabase } from '../supabaseClient';
import { uploadScanImage } from '../historyService';

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

function makeId() {
  if ('crypto' in window && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [image, setImage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanHistoryItem | null>(null);
  const [error, setError] = useState('');
  const [user, setCurrentUser] = useState<{ username: string; id?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'camera'|'upload'>('camera');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

  useEffect(() => {
  // Jika hitungan mundur tidak aktif, abaikan
  if (countdown === null) return;

  // Jika menyentuh 0, eksekusi fungsi jepret dan reset hitungan
  if (countdown === 0) {
    captureFromCamera();
    setCountdown(null);
    return;
  }

  // Turunkan angka setiap 1000ms (1 detik)
  const timer = setTimeout(() => {
    setCountdown(countdown - 1);
  }, 1000);

  // Bersihkan memori agar tidak bocor
  return () => clearTimeout(timer);
}, [countdown]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Browser does not support camera. Use photo upload.');
      return;
    }
    try {
      stopCamera();
      setImage('');
      setResult(null);
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      alert('Failed to open camera. Make sure permission is active and open via localhost/HTTPS.');
    }
  }

  function captureFromCamera(): string {
    const video = videoRef.current;
    if (!video || !streamRef.current) return '';
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImage(dataUrl);
    stopCamera();
    return dataUrl;
  }

  function uploadPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxSize = 800;
        
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          stopCamera();
          setImage(dataUrl);
          setResult(null);
          setError('');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function analyzeNow() {
    const selectedImage = image || captureFromCamera();
    if (!selectedImage) {
      alert('Open camera and take a photo, or upload a photo first.');
      return;
    }
    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      // Convert base64 dataURL → Blob → File for multipart upload
      const res = await fetch(selectedImage);
      const blob = await res.blob();
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header — browser sets it with boundary automatically
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `Server error ${response.status}`);
      }

      // Backend returns flat object: { skin_type, acne_detections, zones, overall_confidence, annotated_image, face_crop }
      const data = await response.json();

      // Determine acne severity from detections
      const detections = data.acne_detections || [];
      const hasInflamedSevere = detections.some((d: any) => d.category === 'Meradang Parah');
      const hasInflamed = detections.some((d: any) => d.category === 'Meradang');
      const acneSeverityLabel = hasInflamedSevere ? 'Inflamed (Severe)' : hasInflamed ? 'Inflamed' : detections.length > 0 ? 'Non-Inflamed' : 'Clear';
      const overallCondition = hasInflamedSevere || hasInflamed ? 'Needs Attention' : detections.length > 0 ? 'Mild' : 'Clear';

      const aiResultJson = {
        skin_type: data.skin_type,
        skin_confidence: data.skin_confidence,
        acne_detections: detections,
        zones: data.zones || [],
        overall_confidence: data.overall_confidence,
      };

      const item: ScanHistoryItem = {
        id: makeId(),
        image: data.annotated_image || selectedImage,
        skinType: data.skin_type ? (data.skin_type.charAt(0).toUpperCase() + data.skin_type.slice(1)) : 'Unknown',
        skinTypeDesc: 'Detected skin type from AI',
        acneType: detections.length > 0 ? detections[0].acne_type : 'None',
        acneTypeDesc: acneSeverityLabel,
        overallCondition,
        skincareTips: ['Maintain a good skincare routine and consult a dermatologist if needed.'],
        confidence: data.overall_confidence ? Math.round(data.overall_confidence * 100) : 85,
        date: new Date().toISOString(),
        isDemo: false,
        aiResultJson,
      };

      // Upload image to Supabase Storage (avoids storing large base64 in DB row)
      let imageUrl = item.image;
      if (user?.id && item.image.startsWith('data:')) {
        imageUrl = await uploadScanImage(item.image, item.id);
      }
      const itemWithUrl = { ...item, image: imageUrl };

      // Save to localStorage
      const raw = localStorage.getItem(STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([itemWithUrl, ...history]));

      // Also save to Supabase if user is logged in
      if (user?.id) {
        const { error: insertError } = await supabase.from('scan_history').insert({
          id: itemWithUrl.id,
          user_id: user.id,
          image: imageUrl,
          skin_type: itemWithUrl.skinType,
          skin_type_desc: itemWithUrl.skinTypeDesc,
          acne_type: itemWithUrl.acneType,
          acne_type_desc: itemWithUrl.acneTypeDesc,
          overall_condition: itemWithUrl.overallCondition,
          skincare_tips: itemWithUrl.skincareTips,
          confidence: itemWithUrl.confidence,
          is_demo: false,
          ai_result_json: aiResultJson,
          created_at: itemWithUrl.date
        });
        if (insertError) {
          console.error('Supabase insert error:', insertError);
        }
      }

      setResult(itemWithUrl);
    } catch (err: any) {
      setError(`Analysis Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  function resetScan() {
    stopCamera();
    setImage('');
    setResult(null);
    setError('');
    if (activeTab === 'camera') {
        openCamera();
    }
  }

  useEffect(() => {
      if (activeTab === 'camera' && !result && !image) {
          openCamera();
      } else {
          stopCamera();
      }
      return () => stopCamera();
  }, [activeTab]);

  return (
    <div className="scan-page">
      <nav className="scan-nav">
        <a className="scan-logo" href={user ? '/home' : '/'}>
          <img src={logoImg} alt="Logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </a>
        <div className="scan-nav-actions">
          <a href="/dashboard">Dashboard</a>
          <a className="nav-active" href="/scan">Analyze Skin</a>
          <a href="/history">Scan History</a>
          <a href="/progress">Progress Tracker</a>
        </div>
        <a href="/profile" className="scan-nav-avatar" title="Profile">
          <span className="scan-avatar-circle">{user ? getInitials(user.username) : '👤'}</span>
        </a>
      </nav>

      {analyzing && (
        <div className="scan-loading">
          <div className="scan-spinner" />
          <h2>Analyzing photo...</h2>
          <p>AI is detecting your skin type and acne condition.</p>
        </div>
      )}

      <main className="scan-shell">
        <header className="scan-header">
          <p>Skin Scan</p>
          <h1>Detect Skin Type & Acne</h1>
          <span>Perform a skin health check using our Computer Vision model pipeline.</span>
        </header>

        {error && <div className="scan-offline-note" style={{marginBottom: '20px', color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2'}}>⚠️ {error}</div>}

        {/* ─── Input Card ─────────────────────────────────────────────────── */}
        {!result && (
          <section className="scan-card" style={{ maxWidth: '900px', display: 'flex', gap: '30px', padding: '30px' }}>
            <div style={{ flex: 2 }}>
                <div className="scan-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #d6d2c4', paddingBottom: '10px' }}>
                    <button 
                        style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'camera' ? 700 : 500, color: activeTab === 'camera' ? '#2b2b1f' : '#918b6b', cursor: 'pointer', borderBottom: activeTab === 'camera' ? '2px solid #2b2b1f' : 'none' }}
                        onClick={() => { setActiveTab('camera'); setImage(''); }}
                    >
                        Webcam Camera
                    </button>
                    <button 
                        style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'upload' ? 700 : 500, color: activeTab === 'upload' ? '#2b2b1f' : '#918b6b', cursor: 'pointer', borderBottom: activeTab === 'upload' ? '2px solid #2b2b1f' : 'none' }}
                        onClick={() => { setActiveTab('upload'); stopCamera(); }}
                    >
                        Upload Image
                    </button>
                </div>

                <div className="scan-preview" style={{ marginBottom: '15px', position: 'relative' }}>
                  <video ref={videoRef} className={cameraOpen ? 'show' : ''} autoPlay playsInline muted />
                  
                  {/* Tambahkan Overlay Angka Hitungan Mundur di atas video */}
                  {countdown !== null && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.4)', color: 'white',
                      fontSize: '6rem', fontWeight: 'bold', zIndex: 10, borderRadius: '8px'
                    }}>
                      {countdown > 0 ? countdown : '📸'}
                    </div>
                  )}

                  {image && <img src={image} alt="Preview scan" />}
                  {!cameraOpen && !image && (
                    <div className="scan-empty">
                      <strong>📷</strong>
                      <p>{activeTab === 'camera' ? 'Camera will appear here' : 'Upload photo will appear here'}</p>
                    </div>
                  )}
                  {(cameraOpen || image) && activeTab === 'camera' && <div className="face-guide" />}
                </div>

                <div className="scan-controls" style={{ justifyContent: 'center' }}>
                    {activeTab === 'camera' ? (
                        <>
                            {!image ? (
                              <button 
                                type="button" 
                                className="primary" 
                                onClick={() => setCountdown(3)} // Memicu hitungan dari angka 3
                                disabled={!cameraOpen || countdown !== null} // Disable tombol saat sedang menghitung
                              >
                                {countdown !== null ? `Capturing in ${countdown}...` : '📸 Capture Photo (3s)'}
                              </button>
                            ) : (
                              
                                <>
                                    <button type="button" onClick={() => { setImage(''); openCamera(); }}>Retake</button>
                                    <button type="button" className="primary" onClick={analyzeNow} disabled={analyzing}>Analyze Now</button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {!image ? (
                                <label className="primary" style={{ cursor: 'pointer' }}>
                                    Upload Photo
                                    <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                                </label>
                            ) : (
                                <>
                                    <label style={{ cursor: 'pointer' }}>
                                        Change Photo
                                        <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                                    </label>
                                    <button type="button" className="primary" onClick={analyzeNow} disabled={analyzing}>Analyze Now</button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Guidelines Panel */}
            <div className="scan-guidelines" style={{ flex: 1, backgroundColor: '#fafaf8', padding: '20px', borderRadius: '16px', border: '1px solid #e5e3db' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Guidelines
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#6b6b55', marginBottom: '20px' }}>For reliable Computer Vision inference</p>
                
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#2b2b1f', marginBottom: '4px' }}>💡 Lighting Conditions</h4>
                    <p style={{ fontSize: '0.75rem', color: '#918b6b' }}>Ensure you are in a bright, evenly lit room. Avoid strong backlights or heavy side-shadows.</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#2b2b1f', marginBottom: '4px' }}>👓 Facial Accessories</h4>
                    <p style={{ fontSize: '0.75rem', color: '#918b6b' }}>Please remove glasses, hats, face masks, or bold makeup before scanning.</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#2b2b1f', marginBottom: '4px' }}>👱‍♀️ Hair Alignment</h4>
                    <p style={{ fontSize: '0.75rem', color: '#918b6b' }}>Tie back long hair or bangs. Your forehead, cheeks, nose, and chin must be fully visible.</p>
                </div>
                <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#2b2b1f', marginBottom: '4px' }}>😐 Neutral Expression</h4>
                    <p style={{ fontSize: '0.75rem', color: '#918b6b' }}>Look straight at the camera with a neutral, relaxed expression. Avoid smiling or squinting.</p>
                </div>
            </div>
          </section>
        )}

        {/* ─── Result: Full Split Layout ──────────────────────────────────── */}
        {result && (
          <section className="scan-result-full">
            {result.isDemo && (
              <div className="result-note">
                <span className="note-badge">Note 1</span>
                <div>
                  <strong>AI not connected</strong> — Results below are
                  sample data for display. Connect the AI model in{' '}
                  <code>Backend/.env</code> for actual photo
                  analysis.
                </div>
              </div>
            )}

            {/* ── Top Split: Foto (kiri 50%) + Analisis (kanan 50%) ────────── */}
            <div className="result-split">
              {/* Kiri — Foto besar */}
              <div className="result-image-panel">
                <div className="result-image-wrap">
                  <img src={result.image} alt="Scan result" className="result-big-photo" />
                </div>
                {!result.isDemo && (
                  <p className="result-accuracy-label">
                    🎯 Average accuracy: <strong>{result.confidence}%</strong>
                  </p>
                )}
              </div>

              {/* Kanan — Info cards */}
              <div className="result-info-panel">
                <div className="result-cards-stacked">
                  <div className="result-card skin-type-card">
                    <div className="rc-icon">🌿</div>
                    <div className="rc-label">Skin Type</div>
                    <div className="rc-value" style={{ marginTop: '4px' }}>
                      <span style={{ 
                        background: result.skinType.toUpperCase() === 'DRY' ? '#e6f4ff' : result.skinType.toUpperCase() === 'OILY' ? '#fefce8' : '#fff',
                        color: result.skinType.toUpperCase() === 'DRY' ? '#0958d9' : result.skinType.toUpperCase() === 'OILY' ? '#b45309' : '#2b2b1f',
                        border: '1px solid ' + (result.skinType.toUpperCase() === 'DRY' ? '#91caff' : result.skinType.toUpperCase() === 'OILY' ? '#fde68a' : '#d6d2c4'),
                        padding: '4px 16px',
                        borderRadius: '999px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        letterSpacing: '1px'
                      }}>
                        {result.skinType.toUpperCase()}
                      </span>
                    </div>
                    <p className="rc-desc" style={{ marginTop: '12px' }}>{result.skinTypeDesc}</p>
                  </div>
                  <div className="result-card acne-type-card">
                    <div className="rc-icon">🔍</div>
                    <div className="rc-label">Acne Detail</div>
                    <div className="rc-value">{result.aiResultJson?.acne_detections?.length || 0} Total Acne</div>
                    <div className="rc-desc" style={{ marginTop: '8px', lineHeight: '1.6', fontSize: '0.85rem' }}>
                      Comedo: <strong>{result.aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Tidak Meradang').length || 0}</strong> <br/>
                      Inflamed: <strong>{result.aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Meradang').length || 0}</strong> <br/>
                      Severe: <strong>{result.aiResultJson?.acne_detections?.filter((a: any) => a.category === 'Meradang Parah').length || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bawah — Tips Skincare ─────────────────────────────────────── */}
            <div className="result-tips">
              <h3>💡 Skincare Tips for You</h3>
              <ul className="result-tips-list">
                {result.skincareTips.map((tip, i) => (
                  <li key={i}>
                    <span className="tip-num">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="scan-result-actions">
              <a href="/dashboard" className="btn-history">
                View Dashboard
              </a>
              <button type="button" onClick={resetScan} className="btn-reset">
                Rescan
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
