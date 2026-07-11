// 아이 친화 모달 팝업: 선택(충전하기/건너뛰기) + 안내(버튼 1개).
// parent 요소에 오버레이를 붙이고, 선택 시 스스로 제거한다.
// 카드 위에는 이모지 스티커 배지를 얹어 조금 더 재미있게.

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
}

// 지정한 단어만 색 강조 span으로 감싼다. text를 먼저 이스케이프하므로 안전.
// rules: [{ words: string[], className }]
function applyHighlights(text: string, rules: { words: string[]; className: string }[]): string {
  let html = escapeHtml(text);
  for (const { words, className } of rules) {
    for (const w of words) {
      html = html.split(w).join(`<span class="${className}">${w}</span>`);
    }
  }
  return html;
}

function makeOverlay(badgeEmoji?: string): { ov: HTMLDivElement; card: HTMLDivElement } {
  const ov = document.createElement('div');
  ov.className = 'popup-overlay';
  const card = document.createElement('div');
  card.className = 'popup-card';
  if (badgeEmoji) {
    const badge = document.createElement('div');
    badge.className = 'popup-badge';
    badge.textContent = badgeEmoji;
    card.appendChild(badge);
  }
  ov.appendChild(card);
  return { ov, card };
}

// 문장 + [🔋 충전하기][건너뛰기]. onChoose(take)는 정확히 한 번 호출된다(take=충전하기).
export function showChoice(parent: HTMLElement, text: string, onChoose: (take: boolean) => void): HTMLElement {
  const { ov, card } = makeOverlay('💬');
  const msg = document.createElement('p');
  msg.className = 'popup-text';
  msg.textContent = text;
  const row = document.createElement('div');
  row.className = 'popup-buttons';
  const takeBtn = document.createElement('button');
  takeBtn.className = 'popup-btn take';
  takeBtn.textContent = '🔋 충전하기';
  const skipBtn = document.createElement('button');
  skipBtn.className = 'popup-btn skip';
  skipBtn.textContent = '⏭️ 건너뛰기';

  let done = false;
  const finish = (take: boolean): void => {
    if (done) return;
    done = true;
    ov.remove();
    onChoose(take);
  };
  takeBtn.addEventListener('click', () => finish(true));
  skipBtn.addEventListener('click', () => finish(false));

  row.append(takeBtn, skipBtn);
  card.append(msg, row);
  parent.appendChild(ov);
  return ov;
}

// 문장 + 버튼 1개(안내/전환). onOk는 nullable. badgeEmoji로 배지 이모지 지정.
// 충전 직후 짧은 피드백 토스트(클릭 막지 않음, 스스로 사라짐).
// positive=true → 따듯한 말(잘함), false → 차가운 말(아쉬움).
export function showFeedback(parent: HTMLElement, positive: boolean, text?: string): HTMLElement {
  parent.querySelectorAll('.feedback').forEach((e) => e.remove()); // 중첩 방지
  const el = document.createElement('div');
  el.className = `feedback ${positive ? 'pos' : 'neg'}`;
  el.textContent = text ?? (positive ? '⚡ 따듯한 말로 충전!' : '🥶 앗, 차가운 말이야…');
  parent.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1600); // 애니메이션 미지원 대비 보험
  return el;
}

// highlights: [{ words, className }] 지정 시 해당 단어만 색 강조.
export function showInfo(
  parent: HTMLElement,
  text: string,
  buttonLabel: string,
  onOk: (() => void) | null,
  badgeEmoji: string = '✨',
  highlights: { words: string[]; className: string }[] | null = null,
): HTMLElement {
  const { ov, card } = makeOverlay(badgeEmoji);
  card.classList.add('info'); // 여러 줄 안내문이 안 접히도록 넓은 카드
  const msg = document.createElement('p');
  msg.className = 'popup-text';
  if (highlights) msg.innerHTML = applyHighlights(text, highlights);
  else msg.textContent = text;
  const btn = document.createElement('button');
  btn.className = 'popup-btn ok';
  btn.textContent = buttonLabel;
  btn.addEventListener('click', () => { ov.remove(); if (onOk) onOk(); });
  card.append(msg, btn);
  parent.appendChild(ov);
  return ov;
}

// NPC 대화 팝업: 고민 문장 + 선택지 버튼 N개(중립 스타일). buttons 순서는 호출부에서
// 섞어 넘겨 정답 위치가 노출되지 않게 한다. onChoose(warm)은 정확히 한 번 호출된다.
export function showDialogue(
  parent: HTMLElement,
  prompt: string,
  buttons: { label: string; warm: boolean }[],
  onChoose: (warm: boolean) => void,
  badgeEmoji: string = '🐰',
): HTMLElement {
  const { ov, card } = makeOverlay(badgeEmoji);
  ov.classList.add('popup-overlay--dialogue'); // 카드를 오른쪽에 도킹(NPC 안 가리게)
  const msg = document.createElement('p');
  msg.className = 'popup-text';
  msg.textContent = prompt;
  const row = document.createElement('div');
  row.className = 'popup-buttons dialogue';

  let done = false;
  const finish = (warm: boolean): void => {
    if (done) return;
    done = true;
    ov.remove();
    onChoose(warm);
  };
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.className = 'popup-btn dialogue';
    btn.textContent = b.label;
    btn.addEventListener('click', () => finish(b.warm));
    row.appendChild(btn);
  }
  card.append(msg, row);
  parent.appendChild(ov);
  return ov;
}
