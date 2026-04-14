/* ============================================================
   TYPING ANIMATION ENGINE
   typing.js — Hero boot sequence + reusable typeText utility
   ============================================================ */

/**
 * Types text into an element character by character.
 * @param {HTMLElement} element - Target element to type into
 * @param {string} text - Text to type
 * @param {number} speed - Base ms per character (default 60)
 * @returns {Promise<void>} Resolves when typing is complete
 */
window.typeText = function(element, text, speed = 60) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = '';
    function tick() {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        const jitter = speed + (Math.random() * 40 - 20); // 40-80ms range
        setTimeout(tick, Math.max(20, jitter));
      } else {
        resolve();
      }
    }
    tick();
  });
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runHeroSequence() {
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  // Get all hero elements
  const lastLogin = heroSection.querySelector('.terminal-line');
  const promptLines = heroSection.querySelectorAll('.prompt-line');
  const firstPrompt = promptLines[0];
  const firstCommand = firstPrompt.querySelector('.typed-command');
  const heroName = heroSection.querySelector('.hero-name');
  const heroSubtitle = heroSection.querySelector('.hero-subtitle');
  const secondPromptLine = promptLines[1];
  const secondCommand = secondPromptLine.querySelector('.typed-command');
  const heroMission = heroSection.querySelector('.hero-mission');
  const finalPrompt = promptLines[2];

  // Hide elements that start hidden and get revealed during the sequence.
  // The prompt lines (green prompt text) remain visible; only their typed-command
  // content starts empty and is filled in by typeText.
  [lastLogin, heroName, heroSubtitle, heroMission, finalPrompt].forEach(el => {
    if (el) el.classList.add('hidden');
  });

  // 1. Small delay, then fade in "Last login..." line
  await delay(500);
  lastLogin.classList.remove('hidden');
  lastLogin.classList.add('visible');

  // 2. Small delay, then type "whoami"
  await delay(400);
  await typeText(firstCommand, firstCommand.dataset.text, 60);

  // 3. Show name with glitch effect
  await delay(200);
  const glitchEl = heroName.querySelector('.glitch');
  heroName.classList.remove('hidden');
  heroName.classList.add('visible');
  if (glitchEl) {
    glitchEl.classList.add('glitch-active');
    setTimeout(() => glitchEl.classList.remove('glitch-active'), 300);
  }

  // 4. Fade in subtitle
  await delay(400);
  heroSubtitle.classList.remove('hidden');
  heroSubtitle.classList.add('visible');

  // 5. Type "cat mission.txt"
  await delay(600);
  await typeText(secondCommand, secondCommand.dataset.text, 60);

  // 6. Reveal mission text
  await delay(200);
  heroMission.classList.remove('hidden');
  heroMission.classList.add('visible');

  // 7. Show final prompt with blinking cursor
  await delay(400);
  finalPrompt.classList.remove('hidden');
  finalPrompt.classList.add('visible');
}

document.addEventListener('DOMContentLoaded', runHeroSequence);
