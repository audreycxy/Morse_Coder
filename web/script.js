"use strict";

// Same table and rules as morse.py.
const TEXT_TO_MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", '"': ".-..-.",
  "@": ".--.-.",
};
const MORSE_TO_TEXT = Object.fromEntries(
  Object.entries(TEXT_TO_MORSE).map(([char, code]) => [code, char])
);

// Accept the look-alike dot and dash characters people often paste.
const normalize = (s) => s.replace(/[·•∙⋅]/g, ".").replace(/[—–−_]/g, "-");

function looksLikeMorse(s) {
  const t = normalize(s).trim();
  return t.length > 0 && /[.-]/.test(t) && /^[.\-/\s]+$/.test(t);
}

/** Text -> [[{char, code}]] (one array per word; code is null if unknown). */
function encode(text) {
  return text.toUpperCase().split(/\s+/).filter(Boolean)
    .map((word) => [...word].map((char) => ({ char, code: TEXT_TO_MORSE[char] ?? null })));
}

/** Morse -> [[{code, char}]] (one array per word; char is null if unknown). */
function decode(morse) {
  return normalize(morse).trim().split("/")
    .map((word) => word.trim().split(/\s+/).filter(Boolean))
    .filter((word) => word.length)
    .map((word) => word.map((code) => ({ code, char: MORSE_TO_TEXT[code] ?? null })));
}

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const input = $("input");
const output = $("output");
const inputLabel = $("input-label");
const outputLabel = $("output-label");
const detected = $("detected");
const warning = $("warning");
const playBtn = $("play");
const playLabel = $("play-label");
const lamp = $("lamp");
const wpm = $("wpm");
const pitch = $("pitch");
const copyBtn = $("copy");
const modeButtons = document.querySelectorAll(".segmented button");

let mode = "auto";
let plainOutput = "";
let playSequence = []; // [[{code, el}]]

const direction = () =>
  mode !== "auto" ? mode : looksLikeMorse(input.value) ? "decode" : "encode";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ---------- Rendering ----------
function render() {
  stop();
  const dir = direction();
  const value = input.value;
  const isDecode = dir === "decode";

  inputLabel.textContent = isDecode ? "Morse" : "Text";
  outputLabel.textContent = isDecode ? "Text" : "Morse";
  input.placeholder = isDecode
    ? "Enter dots and dashes, e.g. .... .. / - .... . .-. ."
    : "Type a message…";
  input.classList.toggle("is-morse", isDecode);
  output.classList.toggle("is-morse", !isDecode);
  detected.textContent = mode === "auto" && value.trim()
    ? `Detected ${isDecode ? "Morse code" : "plain text"}`
    : "";

  output.replaceChildren();
  playSequence = [];
  const unknown = [];
  const words = isDecode ? decode(value) : encode(value);

  words.forEach((word, wi) => {
    if (wi > 0) output.append(isDecode ? " " : el("span", "sep", " / "));
    const playWord = [];
    word.forEach((item, li) => {
      if (li > 0 && !isDecode) output.append(" ");
      const ok = isDecode ? item.char !== null : item.code !== null;
      const span = el("span", isDecode ? "ch" : "sym", ok ? (isDecode ? item.char : item.code) : "?");
      if (ok) {
        span.title = isDecode ? item.code : item.char;
        playWord.push({ code: item.code, el: span });
      } else {
        span.classList.add("unk");
        const bad = isDecode ? item.code : item.char;
        span.title = isDecode ? `“${bad}” isn't a Morse code letter` : `No Morse code for “${bad}”`;
        unknown.push(bad);
      }
      output.append(span);
    });
    if (playWord.length) playSequence.push(playWord);
  });

  plainOutput = words
    .map((w) => isDecode
      ? w.map((i) => i.char ?? "?").join("")
      : w.map((i) => i.code ?? "?").join(" "))
    .join(isDecode ? " " : " / ");

  if (!words.length) output.append(el("span", "placeholder", "Translation appears here"));

  const unique = [...new Set(unknown)];
  warning.hidden = unique.length === 0;
  if (unique.length) {
    warning.textContent = isDecode
      ? `Not recognized: ${unique.join("  ")} (shown as ?)`
      : `No Morse code for: ${unique.join(" ")} (shown as ?)`;
  }

  playBtn.disabled = playSequence.length === 0;
}

function setMode(next) {
  mode = next;
  modeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === mode)));
  render();
}

// ---------- Audio playback ----------
let audioCtx = null;
let current = null; // { osc, gain, timers, highlighted }

function play(sequence, { button = playBtn } = {}) {
  stop();
  if (!sequence.length) return;
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = Number(pitch.value);
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);

  const unit = 1.2 / Number(wpm.value); // seconds per dot (PARIS standard)
  const volume = 0.25;
  const ramp = 0.005; // softens each beep so it doesn't click
  const timers = [];
  const state = { osc, gain, timers, highlighted: null, button };
  const at = (time, fn) =>
    timers.push(setTimeout(fn, Math.max(0, (time - ctx.currentTime) * 1000)));
  const highlight = (node) => {
    state.highlighted?.classList.remove("active");
    node?.classList.add("active");
    state.highlighted = node;
  };

  let t = ctx.currentTime + 0.08;
  sequence.forEach((word, wi) => {
    if (wi > 0) t += 4 * unit; // word gap = 7 units (3 already added after the letter)
    word.forEach((letter, li) => {
      if (li > 0) t += 2 * unit; // letter gap = 3 units (1 already added)
      at(t, () => highlight(letter.el));
      [...letter.code].forEach((symbol) => {
        const d = (symbol === "." ? 1 : 3) * unit;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + ramp);
        gain.gain.setValueAtTime(volume, t + d - ramp);
        gain.gain.linearRampToValueAtTime(0, t + d);
        at(t, () => lamp.classList.add("on"));
        at(t + d, () => lamp.classList.remove("on"));
        t += d + unit; // gap between symbols = 1 unit
      });
    });
  });

  osc.start();
  osc.stop(t + 0.1);
  at(t, stop);
  current = state;
  if (button === playBtn) {
    playBtn.classList.add("playing");
    playLabel.textContent = "Stop";
  }
}

function stop() {
  if (!current) return;
  const { osc, gain, timers, highlighted } = current;
  timers.forEach(clearTimeout);
  const now = audioCtx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0, now, 0.005);
  try { osc.stop(now + 0.05); } catch { /* already stopped */ }
  highlighted?.classList.remove("active");
  lamp.classList.remove("on");
  playBtn.classList.remove("playing");
  playLabel.textContent = "Play";
  current = null;
}

const isPlayingMessage = () => current?.button === playBtn;

// ---------- Reference keys ----------
function buildKeys() {
  const groups = {
    "keys-letters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "keys-numbers": "0123456789",
    "keys-punct": ".,?'!/()&:;=+-\"@",
  };
  for (const [id, chars] of Object.entries(groups)) {
    const container = $(id);
    for (const char of chars) {
      const code = TEXT_TO_MORSE[char];
      const key = el("button", "key");
      key.type = "button";
      key.setAttribute("aria-label", `${char}: ${code.replace(/\./g, "dot ").replace(/-/g, "dash ")}`);
      key.append(el("span", "k-char", char), el("span", "k-code", code));
      key.addEventListener("click", () => insertFromKey(char, code, key));
      container.append(key);
    }
  }
}

function insertFromKey(char, code, key) {
  const isDecode = direction() === "decode";
  let insert = char;
  if (isDecode) {
    const before = input.value.slice(0, input.selectionStart);
    insert = (before && !/[\s/]$/.test(before) ? " " : "") + code;
  }
  input.setRangeText(insert, input.selectionStart, input.selectionEnd, "end");
  render();
  play([[{ code, el: key }]], { button: key });
}

// ---------- Copy ----------
async function copyOutput() {
  if (!plainOutput) return;
  try {
    await navigator.clipboard.writeText(plainOutput);
  } catch {
    const tmp = el("textarea");
    tmp.value = plainOutput;
    document.body.append(tmp);
    tmp.select();
    document.execCommand("copy");
    tmp.remove();
  }
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
}

// ---------- Wiring ----------
input.addEventListener("input", render);
modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

$("clear").addEventListener("click", () => {
  input.value = "";
  render();
  input.focus();
});

$("swap").addEventListener("click", () => {
  if (!plainOutput) return;
  input.value = plainOutput;
  if (mode !== "auto") setMode(mode === "encode" ? "decode" : "encode");
  else render();
  input.focus();
});

document.querySelectorAll("[data-example]").forEach((chip) =>
  chip.addEventListener("click", () => {
    input.value = chip.dataset.example;
    if (mode !== "auto") setMode(looksLikeMorse(input.value) ? "decode" : "encode");
    else render();
  })
);

copyBtn.addEventListener("click", copyOutput);
playBtn.addEventListener("click", () => (isPlayingMessage() ? stop() : play(playSequence)));

wpm.addEventListener("input", () => ($("wpm-value").textContent = `${wpm.value} WPM`));
pitch.addEventListener("input", () => ($("pitch-value").textContent = `${pitch.value} Hz`));

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    isPlayingMessage() ? stop() : play(playSequence);
  } else if (e.key === "Escape") {
    stop();
  }
});

buildKeys();
render();
