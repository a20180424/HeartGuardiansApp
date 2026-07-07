// 반 결과 데이터 소스 — 포트-어댑터 추상화.
// 컴포넌트/집계 로직은 ClassVotesSource 인터페이스에만 의존한다(가짜/서버 무관).
// 실제 연결은 createServerClassVotesSource(), 오프라인 데모는 createFakeClassVotesSource().
import { fetchClassAnswers } from "./emotionGuide.api";

export interface ClassVote {
  studentId: string;
  studentName: string;
  situationId: number;
  emotionId: string;
  actionId: number;
}

export interface ClassVotesSnapshot {
  votes: ClassVote[]; // 지금까지 응답(도착)한 표
}

export interface ClassVotesSource {
  // 실제 서버의 "폴링" 모델과 동일한 형태. 호출마다 최신 스냅샷을 돌려준다.
  // 전원 대기/완료 판정은 폐기됨 — 서버는 "오늘(KST) 우리 반" 표만 flat 으로 준다.
  fetch(): Promise<ClassVotesSnapshot>;
}

// 결정적 난수(테스트용 seed). mulberry32.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STUDENT_NAMES = [
  "서윤", "하준", "민준", "지우", "도윤", "서연", "예준", "하은", "지유", "우진",
  "수아", "지민", "도현", "하린", "준우", "현우", "지아", "지윤", "건우", "은우",
  "소율", "아린", "유준", "채원", "시우",
];

// 원본 populateMockData 의 상황별 감정 가중치 이식.
function chooseEmotion(situationId: number, rand: number): string {
  switch (situationId) {
    case 1:
      return rand < 0.35 ? "sad" : rand < 0.6 ? "anxiety" : rand < 0.85 ? "anger" : "calm";
    case 2:
      return rand < 0.4 ? "shy" : rand < 0.75 ? "proud" : rand < 0.95 ? "joy" : "calm";
    case 3:
      return rand < 0.4 ? "anxiety" : rand < 0.7 ? "shy" : rand < 0.9 ? "anticipation" : "joy";
    case 4:
      return rand < 0.5 ? "anger" : rand < 0.7 ? "sad" : rand < 0.9 ? "calm" : "anxiety";
    case 5:
      return rand < 0.65 ? "anger" : rand < 0.85 ? "sad" : "calm";
    case 6:
      return rand < 0.45 ? "proud" : rand < 0.8 ? "shy" : "joy";
    case 7:
      return rand < 0.5 ? "anticipation" : rand < 0.75 ? "joy" : rand < 0.9 ? "anxiety" : "calm";
    case 8:
      return rand < 0.45 ? "sad" : rand < 0.85 ? "anxiety" : "calm";
    case 9:
      return rand < 0.6 ? "proud" : rand < 0.85 ? "joy" : "calm";
    case 10:
      return rand < 0.4 ? "anxiety" : rand < 0.7 ? "anticipation" : rand < 0.9 ? "calm" : "sad";
    default:
      return "calm";
  }
}

// 한 학생이 10개 상황에 모두 응답한 표를 생성.
function generateStudentVotes(
  studentId: string,
  studentName: string,
  rng: () => number,
): ClassVote[] {
  const votes: ClassVote[] = [];
  for (let situationId = 1; situationId <= 10; situationId++) {
    votes.push({
      studentId,
      studentName,
      situationId,
      emotionId: chooseEmotion(situationId, rng()),
      actionId: Math.floor(rng() * 6) + 1,
    });
  }
  return votes;
}

// 가짜 어댑터: 25명 × 10상황을 1회 생성해두고, fetch() 호출마다 응답 학생 수를
// arrivalPerTick 씩 늘려 "도착 시뮬레이션"을 한다. 전원 도달 시 complete=true.
export function createFakeClassVotesSource(opts?: {
  totalStudents?: number;
  arrivalPerTick?: number;
  seed?: number;
}): ClassVotesSource {
  const totalStudents = opts?.totalStudents ?? STUDENT_NAMES.length;
  const arrivalPerTick = Math.max(1, opts?.arrivalPerTick ?? 4);
  const rng = makeRng(opts?.seed ?? ((Date.now() & 0xffffffff) || 1));

  // 학생별 표 묶음을 미리 생성(학생 순서 = 도착 순서).
  const perStudent: ClassVote[][] = [];
  for (let i = 0; i < totalStudents; i++) {
    const studentId = `s${i + 1}`;
    const studentName = STUDENT_NAMES[i % STUDENT_NAMES.length];
    perStudent.push(generateStudentVotes(studentId, studentName, rng));
  }

  // 처음부터 몇 명은 이미 응답한 상태로 시작(대기 맥락).
  let responded = Math.min(totalStudents, arrivalPerTick);

  return {
    fetch() {
      const revealed = perStudent.slice(0, responded);
      const snapshot: ClassVotesSnapshot = { votes: revealed.flat() };
      // 다음 폴링 때 더 도착시킨다(이미 전원이면 유지) — 데모용 점진 반영.
      responded = Math.min(totalStudents, responded + arrivalPerTick);
      return Promise.resolve(snapshot);
    },
  };
}

// 서버 어댑터: 실제 API(GET /api/planet2/emotion-guide/class-answers)로 "오늘 우리 반"
// 표를 받아 그대로 스냅샷으로 돌려준다. 인증 헤더는 api.ts 의 저장 자격증명에서 채워진다.
export function createServerClassVotesSource(): ClassVotesSource {
  return {
    async fetch() {
      const votes = await fetchClassAnswers();
      return { votes };
    },
  };
}
