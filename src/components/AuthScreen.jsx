import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from "lucide-react";

export function AuthScreen({ supabase, notice, onDismissNotice }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    onDismissNotice?.();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) setMessage("Akun berhasil dibuat. Sedang masuk...");
        else setMessage("Akun dibuat. Cek email untuk verifikasi, lalu masuk.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage("Link reset password terkirim ke email jika akun terdaftar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || "Autentikasi gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setMessage("");
    onDismissNotice?.();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Redirect ke Google akan berjalan otomatis.
    } catch (error) {
      setMessage(error.message || "Gagal masuk dengan Google. Coba lagi.");
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-icon"><img src="/logo-kalkulator.svg" alt="Logo" width="48" height="48" /></div>
        <p className="auth-brand-name">AVERAGE PRICE CALCULATOR</p>
        <h1>{mode === "login" ? "Selamat datang kembali" : mode === "signup" ? "Buat akun pribadi" : "Reset password"}</h1>
        <p className="auth-description">{mode === "reset" ? "Masukkan email akun. Kami akan mengirim tautan untuk membuat password baru." : "Masuk untuk menggunakan kalkulator dan menyimpan saham serta riwayat analisis di akun Anda."}</p>
        {notice && <div className="auth-notice" role="status">{notice}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input id="auth-email" className="input-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" />
          {mode !== "reset" && <>
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <div className="auth-password-wrap">
              <input id="auth-password" className="input-field" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" />
              <button type="button" className="auth-password-toggle" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="action-btn auth-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="auth-spinner" /> : mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : mode === "signup" ? "Daftar" : "Kirim link reset"}
          </button>
        </form>
        {mode !== "reset" && (
          <>
            <div className="auth-divider" role="separator" aria-hidden="true"><span>atau</span></div>
            <button type="button" className="auth-google" onClick={handleGoogleLogin} disabled={busy}>
              <GoogleIcon />
              <span>Lanjutkan dengan Google</span>
            </button>
          </>
        )}
        <p className="auth-switch">
          {mode === "login" ? <><span>Belum punya akun?</span>{" "}<button type="button" onClick={() => { setMode("signup"); setMessage(""); }}>Daftar</button><br /><button type="button" onClick={() => { setMode("reset"); setMessage(""); }}>Lupa password?</button></> : <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>{mode === "reset" ? "Kembali ke masuk" : "Sudah punya akun? Masuk"}</button>}
        </p>
        <p className="auth-security-note">Data akun dan analisis disimpan secara privat. Gunakan password yang unik.</p>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

