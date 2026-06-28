// 학교 + 학년(버튼) + 반/번호/비밀번호(공용 키패드) [+ 이름(signup만, 시스템 키보드)].
// 서버 호출은 하지 않는다 — 완성된 Credentials를 onSubmit으로 올린다.
import { useEffect, useState } from "react";
import type { School } from "../../lib/auth";
import type { Credentials } from "../../lib/api";
import {
  initialForm,
  applyDigit,
  applyBackspace,
  setActive,
  setGrade,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  type FieldKey,
} from "./auth.logic";
import NumberKeypad from "./NumberKeypad";
import PinDots from "./PinDots";
import SchoolPicker from "./SchoolPicker";

interface Props {
  mode: "login" | "signup";
  schools: School[];
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: (creds: Credentials, name: string) => void;
}

const GRADES = [1, 2, 3, 4, 5, 6];

export default function CredentialForm({ mode, schools, submitting, errorMsg, onSubmit }: Props) {
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

  const nameOk = mode === "login" || name.trim().length > 0;
  const canSubmit = !submitting && schoolId !== null && isComplete(form) && nameOk;

  const numField = (key: FieldKey, label: string, value: string) => (
    <button
      type="button"
      className={`field field--num${form.active === key ? " is-active" : ""}`}
      onClick={() => setForm(setActive(form, key))}
    >
      <span className="field__label">{label}</span>
      <span className="field__value">{value || "—"}</span>
    </button>
  );

  return (
    <div className="auth-form">
      <div className="auth-form__left">
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

        <div className="grade-row">
          <span className="field__label">학년</span>
          <div className="grade-row__btns">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                className={`grade-btn${form.grade === g ? " is-active" : ""}`}
                onClick={() => setForm(setGrade(form, g))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="num-row">
          {numField("class", "반", form.class)}
          {numField("number", "번호", form.number)}
          <button
            type="button"
            className={`field field--num${form.active === "pin" ? " is-active" : ""}`}
            onClick={() => setForm(setActive(form, "pin"))}
          >
            <span className="field__label">비밀번호</span>
            <PinDots length={form.pin.length} />
          </button>
        </div>

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

      <div className="auth-form__right">
        <NumberKeypad
          onDigit={(d) => setForm((s) => applyDigit(s, d))}
          onBackspace={() => setForm((s) => applyBackspace(s))}
        />
      </div>
    </div>
  );
}
