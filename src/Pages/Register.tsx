import { useState } from "react";
import '../style/Register.css'
import logoImg from "../assets/logo.png"
import BackgroundImg from "../assets/LogoBackgroundImg.png";
import { navigateTo } from "../main";
import { supabase } from "../supabaseClient";

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const togglePassword = (): void => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Semua field wajib diisi.");
      setSuccess("");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess("Akun berhasil dibuat! Silakan login.");
      setTimeout(() => {
        navigateTo("/auth/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server.");
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
    <div className="page-wrapper">
      <div className="card">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <img className="logo" src={logoImg} alt="Logo" />
          <div className="left-copy">
            <h1>Find Your Acne and Skin <br /> Type here</h1>
            <p>Customized. Confident. Clear.</p>
          </div>
          <img className="hero-img" src={BackgroundImg} alt="Skincare products" />
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <h2>Create Account</h2>

          <div className="field" style={{ marginTop: '30px' }}>
            <input
              type="text"
              id="username"
              placeholder="Full Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            <button className="toggle-pw" type="button" onClick={togglePassword} aria-label="Toggle password">
              {showPassword ? <EyeOnIcon /> : <EyeOffIcon />}
            </button>
          </div>

          <button className="btn-create" type="button" onClick={handleSubmit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0 0' }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0 0' }}>{success}</p>}

          <div className="bottom-links">
            Already have an account? <a href="/auth/login">Log in</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
