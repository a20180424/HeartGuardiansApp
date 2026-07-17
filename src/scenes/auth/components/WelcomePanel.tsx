// 자동 로그인 성공 시 환영 패널. 계속하기 / 다른 계정으로 로그인.
interface Props {
  name: string;
  onContinue: () => void;
  onSwitch: () => void;
  busy: boolean;
}

export default function WelcomePanel({ name, onContinue, onSwitch, busy }: Props) {
  return (
    <div className="auth-chooser">
      <p className="auth-panel__title">
        {name}님
        <br />
        환영해요!
      </p>
      <button type="button" className="btn auth-bigbtn" disabled={busy} onClick={onContinue}>
        {busy ? "잠시만요…" : "계속하기"}
      </button>
      <button type="button" className="btn ghost auth-bigbtn" disabled={busy} onClick={onSwitch}>
        다른 계정으로 로그인
      </button>
    </div>
  );
}
