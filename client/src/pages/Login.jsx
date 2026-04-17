export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-suits">♠ ♥ ♦ ♣</div>
        <h1>Poker</h1>
        <p>Texas Hold'em — play with friends</p>
        <a href="/auth/google" className="google-btn">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
