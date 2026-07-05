import { useEffect, useMemo, useState } from "react";
import { EMOTIONS, SITUATIONS, COPING_ACTIONS } from "./emotionGuide.data";
import type { ClassVotesSource, ClassVotesSnapshot } from "./classResults.source";
import { emotionDistribution, leaderboard, actionBreakdown } from "./classResults.logic";
import "./ClassResultsBoard.css";

const EMPTY_SNAPSHOT: ClassVotesSnapshot = {
  votes: [],
  respondedStudents: 0,
  totalStudents: 0,
  complete: false,
};

const emotionName = (id: string) => EMOTIONS.find((e) => e.id === id)?.name ?? id;
const emotionEmoji = (id: string) => EMOTIONS.find((e) => e.id === id)?.emoji ?? "";
const RANK_BADGE = ["👑", "🥈", "🥉"];

export default function ClassResultsBoard(props: {
  source: ClassVotesSource;
  pollMs: number;
  onComplete: () => void;
}) {
  const { source, pollMs, onComplete } = props;
  const [snap, setSnap] = useState<ClassVotesSnapshot>(EMPTY_SNAPSHOT);
  const [situationId, setSituationId] = useState(1);
  const [emotionId, setEmotionId] = useState<string>(EMOTIONS[0].id);

  // 서버의 10초 폴링 모델과 동일: 마운트 즉시 + pollMs 마다 fetch. (가짜/서버 무관)
  useEffect(() => {
    let alive = true;
    const tick = () => {
      source.fetch().then((s) => {
        if (alive) setSnap(s);
      });
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [source, pollMs]);

  const dist = useMemo(
    () => emotionDistribution(snap.votes, situationId),
    [snap.votes, situationId],
  );
  const maxCount = Math.max(1, ...dist.map((d) => d.count));
  const board = useMemo(() => leaderboard(snap.votes, situationId), [snap.votes, situationId]);
  const actions = useMemo(
    () => actionBreakdown(snap.votes, situationId, emotionId),
    [snap.votes, situationId, emotionId],
  );

  return (
    <div className="crb">
      {/* 상단: 하티 말풍선 + 응답 현황 + 완료 */}
      <div className="crb-top">
        <div className="crb-hati">
          <span className="crb-hati-name">🛰️ 하티</span>
          <span className="crb-hati-line">
            우리 반 친구들은 어떤 대답을 했는지 알아보자. 모두 다 대답을 할 때까지 기다려볼까.
          </span>
        </div>
        <div className="crb-status">
          <div className="crb-respond">
            <span className="crb-respond-label">응답 현황</span>
            <span className="crb-respond-count">
              {snap.respondedStudents} / {snap.totalStudents || "-"}
            </span>
          </div>
          <button
            className="crb-done"
            disabled={!snap.complete}
            onClick={onComplete}
          >
            {snap.complete ? "완료 · 다음으로 ➡️" : "친구들 응답 대기 중…"}
          </button>
        </div>
      </div>

      <div className="crb-body">
        {/* 왼쪽: 상황 선택 + 감정 분포 + 순위표 */}
        <div className="crb-col crb-left">
          <div className="crb-select-row">
            <span className="crb-select-label">🔍 감정 상황</span>
            <select
              className="crb-select"
              value={situationId}
              onChange={(e) => setSituationId(Number(e.target.value))}
            >
              {SITUATIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="crb-section-label">📊 감정 분포 (감정을 누르면 대처가 보여요)</div>
          <div className="crb-chart">
            {dist.map((d) => (
              <button
                key={d.emotionId}
                className={`crb-bar-row${d.emotionId === emotionId ? " sel" : ""}`}
                onClick={() => setEmotionId(d.emotionId)}
              >
                <span className="crb-bar-name">
                  {emotionEmoji(d.emotionId)} {emotionName(d.emotionId)}
                </span>
                <span className="crb-bar-track">
                  <span
                    className="crb-bar-fill"
                    style={{ width: `${(d.count / maxCount) * 100}%` }}
                  />
                  <span className="crb-bar-num">
                    {d.count}명 ({d.pct}%)
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="crb-section-label">🏆 감정 분포 순위 (1~3위)</div>
          <div className="crb-leaderboard">
            {board.map((item, i) => (
              <div
                key={i}
                className={`crb-rank${item.count > 0 ? "" : " empty"}`}
              >
                {item.count > 0 ? (
                  <>
                    <span className="crb-rank-badge">{RANK_BADGE[i]}</span>
                    <span className="crb-rank-name">
                      {emotionEmoji(item.emotionId)} {emotionName(item.emotionId).split("/")[0]}
                    </span>
                    <span className="crb-rank-count">
                      {item.count}명 ({item.pct}%)
                    </span>
                  </>
                ) : (
                  <span className="crb-rank-wait">기록 대기</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 선택 감정의 해소 & 공감 분석 */}
        <div className="crb-col crb-right">
          <div className="crb-section-label">
            🛡️ 해소 &amp; 공감 분석 ·{" "}
            <span className="crb-sel-emotion">
              {emotionEmoji(emotionId)} {emotionName(emotionId)}
            </span>
          </div>
          <div className="crb-actions">
            {actions.map((a) => {
              const meta = COPING_ACTIONS[emotionId]?.actions.find((x) => x.id === a.actionId);
              const isSelf = a.actionId <= 3;
              return (
                <div key={a.actionId} className="crb-action">
                  <div className="crb-action-head">
                    <span className="crb-action-emoji">{meta?.emoji}</span>
                    <span className="crb-action-text">{meta?.text}</span>
                    <span className={`crb-action-badge ${isSelf ? "self" : "wish"}`}>
                      {isSelf ? "스스로 해소" : "바라는 공감"}
                    </span>
                    <span className="crb-action-count">{a.count}명</span>
                  </div>
                  <div className="crb-action-voters">
                    <span className="crb-voters-label">📝 선택 대원:</span>{" "}
                    {a.voterNames.length ? a.voterNames.join(", ") : "아직 없어요"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
