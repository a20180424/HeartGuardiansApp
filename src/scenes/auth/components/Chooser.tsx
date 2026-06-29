// 첫 화면: 로그인 / 회원가입 두 갈래(게스트 없음).
interface Props {
  onLogin: () => void;
  onSignup: () => void;
}

export default function Chooser({ onLogin, onSignup }: Props) {
  return (
    <div className="auth-chooser">
      <p className="auth-panel__title">어떻게 시작할까요?</p>
      <button type="button" className="btn auth-bigbtn" onClick={onLogin}>
        로그인
      </button>
      <button type="button" className="btn ghost auth-bigbtn" onClick={onSignup}>
        회원가입
      </button>
    </div>
  );
}
