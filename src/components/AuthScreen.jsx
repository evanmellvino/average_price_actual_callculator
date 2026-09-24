import { useState } from "react";
import { Calculator, Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from "lucide-react";

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

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-icon"><Calculator size={25} /></div>
        <p className="summary-eyebrow">AVERAGE PRICE CALCULATOR</p>
        <h1>{mode === "login" ? "Selamat datang kembali" : "Buat akun pribadi"}</h1>
        <p className="auth-description">Masuk untuk menggunakan kalkulator dan menyimpan saham serta riwayat analisis di akun Anda.</p>
        {notice && <div className="auth-notice" role="status">{notice}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input id="auth-email" className="input-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" />
          <label className="auth-label" htmlFor="auth-password">Password</label>
          <div className="auth-password-wrap">
            <input id="auth-password" className="input-field" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" />
            <button type="button" className="auth-password-toggle" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="action-btn auth-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="auth-spinner" /> : mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
            {mode === "login" ? "Daftar" : "Masuk"}
          </button>
        </p>
        <p className="auth-security-note">Data akun dan analisis disimpan secara privat. Gunakan password yang unik.</p>
      </section>
    </main>
  );
}
