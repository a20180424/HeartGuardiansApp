// 앱 내장 숫자 키패드(0~9, ⌫). 표현만 담당 — 상태/서버 로직 없음.
// 내장 키패드가 문제되면 이 컴포넌트만 안드로이드 키보드로 교체한다.
interface Props {
  onDigit: (d: string) => void;
  onBackspace: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function NumberKeypad({ onDigit, onBackspace }: Props) {
  return (
    <div className="keypad" role="group" aria-label="숫자 키패드">
      {KEYS.map((k) => (
        <button key={k} type="button" className="keypad__key" onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <span className="keypad__spacer" aria-hidden="true" />
      <button type="button" className="keypad__key" onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        className="keypad__key keypad__key--back"
        onClick={onBackspace}
        aria-label="지우기"
      >
        ⌫
      </button>
    </div>
  );
}
