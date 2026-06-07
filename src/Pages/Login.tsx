import { useState } from "react";
import '../style/Login.css'
import logoImg from "../assets/logo.png";
import BackgroundImg from "../assets/LogoBackgroundImg.png";
import { navigateTo } from "../main";
import { supabase } from "../supabaseClient";

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const togglePassword = (): void => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      setSuccess("");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (signInError) {
        throw signInError;
      }

      setSuccess("Login berhasil! Mengalihkan...");
      
      if (rememberMe) {
          localStorage.setItem('skinmate_remember', 'true');
      } else {
          localStorage.removeItem('skinmate_remember');
      }

      setTimeout(() => {
        navigateTo("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const EyeOffIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );

  const EyeOnIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} width={22} height={22}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {/* LEFT PANEL */}
        <div className="login-left-panel">
          <img className="login-logo" src={logoImg} alt="Logo" />
          <div className="login-left-copy">
            <h1>Welcome Back to SkinMate</h1>
            <p>Your skin journey continues here.</p>
          </div>
          <img className="login-hero-img" src={BackgroundImg} alt="Skincare products" />
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right-panel">
          <h2>Log In</h2>

          <div className="login-field" style={{ marginTop: '30px' }}>
            <input
              type="email"
              id="login-email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            <button className="login-toggle-pw" type="button" onClick={togglePassword} aria-label="Toggle password">
              {showPassword ? <EyeOnIcon /> : <EyeOffIcon />}
            </button>
          </div>

          <div className="login-options">
            <label className="login-remember" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#918b6b' }}
              />
              <span style={{ color: '#6b6b55', fontSize: '0.85rem' }}>Remember me</span>
            </label>
          </div>

          <button className="login-btn-submit" type="button" onClick={handleSubmit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0 0' }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0 0' }}>{success}</p>}

          <div className="login-bottom-links">
            Don't have an account? <a href="/auth/register">Register</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
