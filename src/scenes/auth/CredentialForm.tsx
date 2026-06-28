// 학교 + 이름(signup) + 학년/반/번호(드롭다운) + 비밀번호[/확인](시스템 키보드).
// 서버 호출은 하지 않는다 — 완성된 Credentials를 onSubmit으로 올린다.
import { useEffect, useState } from "react";
import type { School } from "../../lib/auth";
import type { Credentials } from "../../lib/api";
import {
  initialForm,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  sanitizePin,
} from "./auth.logic";
import SchoolPicker from "./SchoolPicker";

interface Props {
  mode: "login" | "signup";
  schools: School[];
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: (creds: Credentials, name: string) => void;
  onBack: () => void;
}

const GRADES = Array.from({ length: 6 }, (_, i) => i + 1); // 1..6
const CLASSES = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10
const NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1); // 1..30

export default function CredentialForm({ mode, schools, submitting, errorMsg, onSubmit, onBack }: Props) {
  const [form, setForm] = useState(initialForm);
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(
    () => pickDefaultSchool(schools, null)?.id ?? null,
  );

  // 학교 목록은 비동기로 도착한다. 아직 미선택이면 기본 학교를 채운다.
  useEffect(() => {
    if (schoolId === null) {
      const def = pickDefaultSchool(schools, null);
      if (def) setSchoolId(def.id);
    }
  }, [schools, schoolId]);

  const mismatch =
    mode === "signup" && form.pinConfirm.length === 4 && form.pin !== form.pinConfirm;
  const canSubmit = !submitting && schoolId !== null && isComplete(form, mode, name);

  const numSelect = (key: "grade" | "class" | "number", label: string, options: number[]) => (
    <label className="field field--select">
      <span className="field__label">{label}</span>
      <select
        className="field__select"
        value={form[key] ?? ""}
        onChange={(e) =>
          setForm((s) => ({ ...s, [key]: e.target.value === "" ? null : Number(e.target.value) }))
        }
      >
        <option value="" disabled>
          선택
        </option>
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const pinInput = (key: "pin" | "pinConfirm", label: string, placeholder: string) => (
    <label className="field field--pin">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={form[key]}
        onChange={(e) => setForm((s) => ({ ...s, [key]: sanitizePin(e.target.value) }))}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <div className="auth-form-wrap">
      <button type="button" className="btn ghost auth-back" onClick={onBack}>
        ← 뒤로
      </button>

      <div className="auth-form">
        <SchoolPicker schools={schools} value={schoolId} onChange={setSchoolId} />

        {mode === "signup" && (
          <label className="field field--name">
            <span className="field__label">이름</span>
            <input
              className="field__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              maxLength={20}
            />
          </label>
        )}

        <div className="select-row">
          {numSelect("grade", "학년", GRADES)}
          {numSelect("class", "반", CLASSES)}
          {numSelect("number", "번호", NUMBERS)}
        </div>

        {pinInput("pin", "비밀번호", "숫자 4자리")}
        {mode === "signup" && pinInput("pinConfirm", "비밀번호 확인", "다시 입력")}

        {mismatch && <p className="auth-error">비밀번호가 일치하지 않아요.</p>}
        {errorMsg && <p className="auth-error">{errorMsg}</p>}

        <button
          type="button"
          className="btn auth-submit"
          disabled={!canSubmit}
          onClick={() => schoolId && onSubmit(toCredentials(form, schoolId), name.trim())}
        >
          {submitting ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </div>
    </div>
  );
}
