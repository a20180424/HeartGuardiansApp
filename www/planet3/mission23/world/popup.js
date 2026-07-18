// 아이 친화 모달 팝업: 선택(충전하기/건너뛰기) + 안내(버튼 1개) + NPC 대화.
// src/scenes/planet/planet3/world/popup.ts 이식 — 타입만 제거, 로직 동일.

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

// 지정한 단어만 색 강조 span으로 감싼다. text를 먼저 이스케이프하므로 안전.
function applyHighlights(text, rules) {
  let html = escapeHtml(text);
  for (const { words, className } of rules) {
    for (const w of words) {
      html = html.split(w).join(`<span class="${className}">${w}</span>`);
    }
  }
  return html;
}

function makeOverlay(badgeEmoji) {
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
export function showChoice(parent, text, onChoose) {
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
  const finish = (take) => {
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
export function showFeedback(parent, positive, text) {
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
export function showInfo(parent, text, buttonLabel, onOk, badgeEmoji = '✨', highlights = null) {
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

// NPC 대화 팝업: 고민 문장 + 선택지 버튼 N개(중립 스타일).
export function showDialogue(parent, prompt, choices, onChoose, badgeEmoji = '🐰') {
  const { ov, card } = makeOverlay(badgeEmoji);
  ov.classList.add('popup-overlay--dialogue'); // 카드를 오른쪽에 도킹(NPC 안 가리게)
  const msg = document.createElement('p');
  msg.className = 'popup-text';
  msg.textContent = prompt;
  const row = document.createElement('div');
  row.className = 'popup-buttons dialogue';

  let done = false;
  const finish = (index) => {
    if (done) return;
    done = true;
    ov.remove();
    onChoose(index);
  };
  choices.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'popup-btn dialogue';
    btn.textContent = label;
    btn.addEventListener('click', () => finish(i));
    row.appendChild(btn);
  });
  card.append(msg, row);
  parent.appendChild(ov);
  return ov;
}
