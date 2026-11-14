/**
 * CNC Audio-First Constraint Trainer
 * Reads activities.csv from the same repository directory.
 * Supports both emojis (e.g., "⚙️") and custom image/SVG paths (e.g., "assets/drill-bit.svg")
 * inside the same `visual` column.
 */

let activities = [];
let currentIndex = 0;
let showButtonLabels = false;

const els = {
  stepCounter: document.getElementById("step-counter"),
  toggleLabelsBtn: document.getElementById("toggle-labels-btn"),
  playAudioBtn: document.getElementById("play-audio-btn"),
  slowAudioBtn: document.getElementById("slow-audio-btn"),
  accordion: document.getElementById("transcript-accordion"),
  promptFi: document.getElementById("prompt-fi"),
  promptEn: document.getElementById("prompt-en"),
  feedbackBar: document.getElementById("feedback-bar"),
  buttonGrid: document.getElementById("button-grid"),
  prevStepBtn: document.getElementById("prev-step-btn"),
  nextStepBtn: document.getElementById("next-step-btn"),
  resetBtn: document.getElementById("reset-btn"),
};

// Parse simple CSV respecting quoted fields
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || "").trim();
    });
    return row;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Detect whether a `visual` cell is an image/SVG path or an emoji
function isImageAsset(value) {
  return /\.(svg|png|jpg|jpeg|webp|gif)$/i.test(value) || value.startsWith("assets/") || value.startsWith("http");
}

function renderVisual(visualValue, altText) {
  if (isImageAsset(visualValue)) {
    const img = document.createElement("img");
    img.src = visualValue;
    img.alt = altText;
    img.className = "visual-img";
    return img;
  }
  const span = document.createElement("span");
  span.className = "visual-emoji";
  span.textContent = visualValue || "🔘";
  return span;
}

// Native Web Speech API (works directly on GitHub Pages / mobile browsers)
function speakFinnish(text, rate = 0.95) {
  if (!("speechSynthesis" in window)) {
    showFeedback("Selaimesi ei tue puhesynteesiä.", "error");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fi-FI";
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const fiVoice = voices.find((v) => v.lang.toLowerCase().startsWith("fi"));
  if (fiVoice) utterance.voice = fiVoice;

  window.speechSynthesis.speak(utterance);
}

function showFeedback(message, type) {
  els.feedbackBar.textContent = message;
  els.feedbackBar.className = `feedback-bar ${type}`;
}

function hideFeedback() {
  els.feedbackBar.className = "feedback-bar hidden";
}

function renderStep() {
  if (!activities.length) return;
  const step = activities[currentIndex];

  // Collapse transcript accordion on every new step so listening comes first
  els.accordion.removeAttribute("open");
  hideFeedback();

  els.stepCounter.textContent = `Vaihe ${currentIndex + 1} / ${activities.length}`;
  els.promptFi.textContent = step.prompt_fi;
  els.promptEn.textContent = step.prompt_en;

  // Build up to 4 buttons from CSV columns btn1..btn4
  els.buttonGrid.innerHTML = "";
  for (let i = 1; i <= 4; i++) {
    const label = step[`btn${i}_label`];
    const visual = step[`btn${i}_visual`];
    if (!label && !visual) continue;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cnc-btn";
    btn.dataset.index = String(i);

    const visualSlot = document.createElement("div");
    visualSlot.className = "visual-slot";
    visualSlot.appendChild(renderVisual(visual, label));

    const labelSpan = document.createElement("span");
    labelSpan.className = showButtonLabels ? "btn-label" : "btn-label hidden-label";
    labelSpan.textContent = label;

    btn.appendChild(visualSlot);
    btn.appendChild(labelSpan);

    btn.addEventListener("click", () => handleButtonPress(i, btn, step));
    els.buttonGrid.appendChild(btn);
  }
}

function handleButtonPress(selectedIndex, btnEl, step) {
  const targetIndex = Number(step.target_btn);
  document.querySelectorAll(".cnc-btn").forEach((b) => b.classList.remove("correct", "wrong"));

  if (selectedIndex === targetIndex) {
    btnEl.classList.add("correct");
    showFeedback(`Oikein! (${step[`btn${selectedIndex}_label`]})`, "success");
    setTimeout(() => {
      if (currentIndex < activities.length - 1) {
        currentIndex++;
        renderStep();
        speakFinnish(activities[currentIndex].prompt_fi, 0.95);
      } else {
        showFeedback("Kaikki vaiheet suoritettu!", "success");
      }
    }, 900);
  } else {
    btnEl.classList.add("wrong");
    showFeedback("Väärä painike. Kuuntele ohje uudelleen.", "error");
    speakFinnish(step.prompt_fi, 0.85);
  }
}

async function init() {
  try {
    const response = await fetch("activities.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("activities.csv ei löytynyt");
    const csvText = await response.text();
    activities = parseCSV(csvText);
    renderStep();
  } catch (err) {
    showFeedback("Virhe ladattaessa activities.csv-tiedostoa. Varmista että ajat sivua palvelimelta (esim. GitHub Pages).", "error");
    console.error(err);
  }
}

// Event Listeners
els.playAudioBtn.addEventListener("click", () => {
  if (activities[currentIndex]) speakFinnish(activities[currentIndex].prompt_fi, 0.95);
});

els.slowAudioBtn.addEventListener("click", () => {
  if (activities[currentIndex]) speakFinnish(activities[currentIndex].prompt_fi, 0.72);
});

els.toggleLabelsBtn.addEventListener("click", () => {
  showButtonLabels = !showButtonLabels;
  els.toggleLabelsBtn.textContent = showButtonLabels ? "🏷️ Tekstit näkyvissä" : "👁️ Vain symbolit";
  document.querySelectorAll(".btn-label").forEach((el) => {
    el.classList.toggle("hidden-label", !showButtonLabels);
  });
});

els.prevStepBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderStep();
  }
});

els.nextStepBtn.addEventListener("click", () => {
  if (currentIndex < activities.length - 1) {
    currentIndex++;
    renderStep();
  }
});

els.resetBtn.addEventListener("click", () => {
  currentIndex = 0;
  renderStep();
});

// Preload voices on mobile browsers
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

init();
