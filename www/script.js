function fitStage() {
  const stage = document.getElementById("stage");
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener("resize", fitStage);
fitStage();
