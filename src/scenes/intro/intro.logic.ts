/**
 * 건너뛰기 시 영상을 마지막 프레임 근처(끝에서 0.1초 전)로 보낼 seek 목표(초).
 * 정확히 duration으로 seek하면 프레임이 표시되지 않을 수 있어 약간 앞으로 둔다.
 * duration이 유효하지 않으면(메타데이터 미로드: 0/NaN/Infinity) 0을 반환한다.
 */
export function skipSeekTarget(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, duration - 0.1);
}
