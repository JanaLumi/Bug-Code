/**
 * CNC Generative Dictionary Trainer
 * Pulls from dictionary.csv, groups by interface tags, 
 * enforces safety fallbacks, and supports dynamic layer toggles.
 */

let dictionary = [];
let currentRoundItems = []; // 4 items: [target, closeDistractor, neutral1, neutral2]
let currentTargetItem = null;

let showGraphics = true;
let showScript = true;
let activeScriptKey = "mandarin"; // default dropdown value

const els = {
  stepCounter: document.getElementById("step-counter"),
  scriptSelect: document.getElementById("script-select"),
  toggleGraphicsBtn: document.getElementById("toggle-graphics-btn"),
  toggleScriptBtn: document.getElementById("toggle-script-btn"),
  playAudioBtn: document.getElementById("play-audio-btn"),
  slowAudioBtn: document.getElementById("slow-audio-btn"),
  accordion: document.getElementById("transcript-accordion"),
  promptFi: document.getElementById("prompt-fi"),
  promptEn: document.getElementById("prompt-en"),
  feedbackBar: document.getElementById("feedback-bar"),
  buttonGrid: document.getElementById("button-grid"),
  resetBtn: document.getElementById("reset-btn"),
};

// Robust CSV parser supporting quoted fields and pipe-delimited tags
function parseCSV(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = splitCSVLine(lines[0]).map(h => h.trim().replace(/^"(.*)"$/, '$1'));

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      let val = (values[i] || "").trim().replace(/^"(.*)"$/, '$1');
      if (h === "tags") {
        row[h] = val.split("|").map(t => t.trim());
      } else {
        row[h] = val;
      }
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

// Generative Round Builder: 1 Target + 1 Close Semantic Distractor + 2 Neutral Distractors
function generateRound() {
  if (dictionary.length < 4) return;

  // 1. Pick Target
  currentTargetItem = dictionary[Math.floor(Math.random() * dictionary.length)];

  // 2. Find a Close Semantic Distractor (shares at least one tag, not the same item)
  const tagPool = dictionary.filter(item => 
    item.term_id !== currentTargetItem.term_id && 
    item.tags.some(t => currentTargetItem.tags.includes(t))
  );

  let closeDistractor = tagPool.length > 0 
    ? tagPool[Math.floor(Math.random() * tagPool.length)]
    : dictionary.filter(i => i.term_id !== currentTargetItem.term_id)[0];

  // 3. Find 2 Neutral Distractors (from completely different tags/categories if possible)
  const neutralPool = dictionary.filter(item => 
    item.term_id !== currentTargetItem.term_id && 
    item.term_id !== closeDistractor.term_id
  );

  // Shuffle neutral pool and pick 2
  shuffleArray(neutralPool);
  const neutralDistractors = neutralPool.slice(0, 2);

  // Combine and shuffle the 4 choices
  currentRoundItems = [currentTargetItem, closeDistractor, ...neutralDistractors];
  shuffleArray(currentRoundItems);

  renderRound();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function renderRound() {
  els.accordion.removeAttribute("open");
  hideFeedback();

  els.stepCounter.textContent = `Generatiivinen tila • Kohde: ${currentTargetItem.suomi_audio}`;
  els.promptFi.textContent = currentTargetItem.suomi_audio;
  els.promptEn.textContent = currentTargetItem.suomi_transcript_en;

  els.buttonGrid.innerHTML = "";
  
  currentRoundItems.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cnc-btn";

    // Safety fallback: If both graphics and script are toggled off, force graphics on for this button
    const forceGraphics = !showGraphics && !showScript;

    // Layer 1: Graphics / SVG Asset
    const visualSlot = document.createElement("div");
    visualSlot.className = "visual-slot";
    
    const graphicValue = item.emojis || "";
    if (graphicValue.endsWith(".svg")) {
      const img = document.createElement("img");
      img.src = `assets/${graphicValue}`;
      img.alt = item.suomi_transcript_en;
      img.width = 32;
      img.height = 32;
      visualSlot.appendChild(img);
    } else {
      visualSlot.textContent = graphicValue || "🔘";
    }

    if (!showGraphics && !forceGraphics) {
      visualSlot.classList.add("hidden-layer");
    }

    // Layer 2: Script Option (Mandarin, Japanese, Korean, Hieroglyphics)
    const scriptSlot = document.createElement("div");
    scriptSlot.className = "script-slot";
    scriptSlot.textContent = item[activeScriptKey] || item.mandarin;
    if (!showScript) {
      scriptSlot.classList.add("hidden-layer");
    }

    btn.appendChild(visualSlot);
    btn.appendChild(scriptSlot);

    btn.addEventListener("click", () => handleButtonPress(item, btn));
    els.buttonGrid.appendChild(btn);
  });
}

function handleButtonPress(selectedItem, btnEl) {
  document.querySelectorAll(".cnc-btn").forEach((b) => b.classList.remove("correct", "wrong"));

  if (selectedItem.term_id === currentTargetItem.term_id) {
    btnEl.classList.add("correct");
    showFeedback(`Oikein! (${currentTargetItem.suomi_audio})`, "success");
    
    // Auto-advance momentum after brief validation
    setTimeout(() => {
      generateRound();
      speakSuomi(currentTargetItem.suomi_audio, 0.95);
    }, 650);
  } else {
    btnEl.classList.add("wrong");
    showFeedback("Ei osuma. Tarkastele tilannetta tai kuuntele tarvittaessa.", "error");
  }
}

function speakSuomi(text, rate = 0.95) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fi-FI";
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const fiVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes("fi"));
  if (fiVoice) utterance.voice = fiVoice;

  window._currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function showFeedback(message, type) {
  els.feedbackBar.textContent = message;
  els.feedbackBar.className = `feedback-bar ${type}`;
}

function hideFeedback() {
  els.feedbackBar.className = "feedback-bar hidden";
}

async function init() {
  try {
    const response = await fetch("dictionary.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("dictionary.csv ei löytynyt");
    const csvText = await response.text();
    dictionary = parseCSV(csvText);
    generateRound();
  } catch (err) {
    showFeedback("Virhe ladattaessa dictionary.csv-tiedostoa.", "error");
    console.error(err);
  }
}

// Event Listeners
els.playAudioBtn.addEventListener("click", () => {
  if (currentTargetItem) speakSuomi(currentTargetItem.suomi_audio, 0.95);
});

els.slowAudioBtn.addEventListener("click", () => {
  if (currentTargetItem) speakSuomi(currentTargetItem.suomi_audio, 0.72);
});

els.scriptSelect.addEventListener("change", (e) => {
  activeScriptKey = e.target.value;
  renderRound();
});

els.toggleGraphicsBtn.addEventListener("click", () => {
  showGraphics = !showGraphics;
  els.toggleGraphicsBtn.classList.toggle("active", showGraphics);
  renderRound();
});

els.toggleScriptBtn.addEventListener("click", () => {
  showScript = !showScript;
  els.toggleScriptBtn.classList.toggle("active", showScript);
  renderRound();
});

els.resetBtn.addEventListener("click", () => {
  generateRound();
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

init();
