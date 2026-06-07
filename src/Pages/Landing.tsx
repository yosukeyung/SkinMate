import { useEffect, useState } from 'react';
import '../style/Landing.css'
import logo from '../assets/logo.png'
import githubLogo from '../assets/github_logo.png';
import { getUser } from '../auth';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Landing({ loggedIn: forcedLoggedIn }: { loggedIn?: boolean } = {}) {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  const isLoggedIn = forcedLoggedIn || !!user;
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ['features', 'how', 'skin-types', 'acne-types'];
      let current = '';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className={`sticky-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-logo">
          <img src={logo} alt="logo" width="22" height="29" style={{ marginRight: '5px' }} />
          Skin<span>Mate</span>
        </div>
        <ul className="nav-links">
          <li><a href="#features" className={activeSection === 'features' ? 'nav-active' : ''}>Features</a></li>
          <li><a href="#how" className={activeSection === 'how' ? 'nav-active' : ''}>How It Works</a></li>
          <li><a href="#skin-types" className={activeSection === 'skin-types' ? 'nav-active' : ''}>Skin Type</a></li>
          <li><a href="#acne-types" className={activeSection === 'acne-types' ? 'nav-active' : ''}>Acne Type</a></li>
        </ul>
        {isLoggedIn ? (
          <div className="nav-cta">
            <a href="/scan" className="btn-ghost">Analyze Skin</a>
            <a href="/dashboard" className="btn-ghost">Dashboard</a>
            <a href="/profile" className="nav-avatar-btn" title="Profile">
              <span className="nav-avatar-circle">
                {user ? getInitials(user.username) : '👤'}
              </span>
            </a>
          </div>
        ) : (
          <div className="nav-cta">
            <a href="/auth/login" className="btn-ghost">Login</a>
            <a href="/auth/register" className="btn-solid">Register</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-circle c1"></div>
        <div className="hero-bg-circle c2"></div>
        <div className="hero-content">
          <div className="hero-tag">
            <span className="hero-tag-dot"></span>
            Personal Skin Analysis
          </div>
          <h1>
            Know Your Skin<br /> Find
            <em> The Right</em> Treatment<br />
          </h1>
          <p className="hero-desc">
            Upload a face photo and get an instant analysis of your skin type and acne condition using AI
          </p>
          <div className="hero-actions">
            <a href={isLoggedIn ? "/scan" : "/auth/register"} className="btn-hero">Analyze your skin now</a>
            <a href="#how" className="btn-hero-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
              Look how it works
            </a>
          </div>
          <div className="hero-trust">
            <div className="trust-avatars">
              <span>🧴</span><span>✨</span><span>🌿</span><span>💧</span>
            </div>
            <div className="trust-text">
              <strong>Be an active user</strong>
              Find the best routine for you
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-float">
            <div className="float-badge b1">
              <span className="badge-icon">✅</span>
              <div className="badgea-label"><strong> Skin Type Detection</strong></div>
            </div>
            <div className="float-badge b2">
              <span className="badge-icon">🌟</span>
              <div className="badge-label"><strong>65%-80% accuracy</strong>AI Results</div>
            </div>
            <div className="hero-card-main">
              <h3>What's Your Skin type</h3>
              <p>AI mendeteksi secara otomatis dari foto</p>
              <div className="skin-type-grid">
                <div className="skin-chip chip-oily">🌊 Oily</div>
                <div className="skin-chip chip-normal">🌿 Normal</div>
                <div className="skin-chip chip-sensitive">🍂 Dry</div>
              </div>
              <p className="quiz-analyzing-text">Analyzing your skin...</p>
              <div className="quiz-progress"><div className="quiz-progress-fill"></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-header">
          <span className="section-tag">AI Flow</span>
          <h2>All You Need for<br />Healthy Skin</h2>
          <p>From analysis to product recommendations, all in one place</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>MediaPipe Face Alignment</h3>
            <p>Isolates and crops the face region, automatically removing background noise to guarantee consistent input for downstream classification</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>YOLOv8 Object Detection</h3>
            <p>Scans the cropped face in real-time to pinpoint the precise location of acne lesions, mapping coordinates for bounding box overlays</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>EfficientNet-B0 Classifiers</h3>
            <p>Dual-head inference classifies overall skin type (dry, oily, normal) and fine-grained lesion types (nodules, blackheads, papulae, pustulae, whiteheads)</p>
          </div>
            <div className="feature-card">
            <div className="feature-icon">🧪</div>
            <h3>Skincare Knowledge Base</h3>
            <p>Output clinical-grade, ingredient-focused tips detailing which active ingredients to embrace or avoid based on your metrics</p>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how">
        <div className="section-header">
          <span className="section-tag">How It Works</span>
          <h2>Just 3 Easy Steps</h2>
          <p>A simple process for maximum results</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Upload Photo</h3>
            <p>Take a photo of your face or upload one from your gallery. Ensure there is enough lighting for the best results</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>AI Analysis</h3>
            <p>Our AI automatically analyzes your skin type, acne conditions, and their severity levels</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Get The Result</h3>
            <p>Receive a complete analysis along with a personalized skincare routine tailored to your skin</p>
          </div>
        </div>
      </section>

      {/* SKIN TYPES */}
      <section className="skin-types" id="skin-types">
        <div className="section-header">
          <span className="section-tag">Skin Type</span>
          <h2>Which One Are You?</h2>
          <p>Every skin type has unique needs — our AI helps detect them</p>
        </div>
        <div className="skin-types-grid">
          <div className="skin-type-card">
            <span className="skin-emoji">🌊</span>
            <h4>Oily</h4>
            <p>Excessive sebum production, large pores, prone to blackheads and acne</p>
          </div>
          <div className="skin-type-card">
            <span className="skin-emoji">🍂</span>
            <h4>Dry</h4>
            <p>Skin feels tight, peeling, and dull due to a lack of moisture</p>
          </div>
          <div className="skin-type-card">
            <span className="skin-emoji">🌿</span>
            <h4>Normal</h4>
            <p>Balanced skin, neither too oily nor dry, minimal pores</p>
          </div>
          
        </div>
      </section>

      {/* ACNE TYPES - NEW SECTION */}
      <section className="acne-types" id="acne-types">
        <div className="section-header">
          <span className="section-tag">Acne Type</span>
          <h2>Know Your Acne Type</h2>
          <p>Our AI can identify 3 distinct acne zones</p>
        </div>
        <div className="acne-types-grid">
          <div className="acne-type-card">
            <span className="acne-emoji">✨</span>
            <h4>Acne-Free</h4>
            <p>Clear skin with no visible signs of inflammation or clogged pores</p>
          </div>
          <div className="acne-type-card">
            <span className="acne-emoji">⚫</span>
            <h4>Inflamed</h4>
            <p>Signs of redness, swelling, or irritation detected. This condition often occurs when the skin barrier is compromised or reacting to active acne</p>
          </div>
          <div className="acne-type-card">
            <span className="acne-emoji">🟡</span>
            <h4>Non-Inflamed</h4>
            <p>No signs of active redness, swelling, or irritation detected. Your skin is currently in a calm and stable state</p>
          </div>
      
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>
          Ready to Embark on Your Journey<br />
          Toward <em>Healthier Skin</em>?
        </h2>
        <p>Scan your face now and get your personalized AI skin analysis</p>
        <a href={isLoggedIn ? "/scan" : "/auth/register"} className="btn-cta">Analyze your skin now</a>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          
          {/* 1. BAGIAN KIRI: LOGO */}
          <div className="footer-logo">
            <img src={logo} alt="logo" width="22" height="29" style={{ marginRight: '5px', position: 'relative', top: '3px'}} />
            Skin<span>Mate</span>
          </div>

          {/* 2. BAGIAN TENGAH: DISCLAIMER */}
          <div className="footer-disclaimer" style={{ flex: 1, margin: '0 24px', maxWidth: '800px', color: '#a0a085', fontSize: '0.8rem', lineHeight: '1.5', textAlign: 'center' }}>
            <strong>Disclaimer:</strong> SkinMate is an educational AI research project. It is designed to support skincare awareness using Computer Vision, but it is <strong>not a medical device</strong> and cannot replace professional advice, diagnosis, or treatment from a certified dermatologist.
          </div>

          {/* 3. BAGIAN KANAN: GITHUB */}
          <ul className="footer-links">
            <li>
              <a 
                href="https://github.com/yosukeyung/SkinMate" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <img 
                  src={githubLogo} 
                  alt="GitHub"
                  width={120} 
                  height={65} 
                />
              </a>
            </li>
          </ul>

        </div>
        
        {/* COPYRIGHT TETAP DI BAWAH */}
        <p className="footer-copy">© 2026 Skinmate</p>
      </footer>

    </>
  );
}
