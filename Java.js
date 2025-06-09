// Java.js
const messages = [
  'See live weather worldwide',
  'Track flights in real time',
  'Reveal historical borders',
  'Share your own travel stories'
];

let index = 0;
const rotatingElement = document.getElementById('rotating-text');

function rotate() {
  rotatingElement.textContent = messages[index];
  rotatingElement.classList.remove('fade-in');
  // Trigger reflow to restart animation
  void rotatingElement.offsetWidth;
  rotatingElement.classList.add('fade-in');
  index = (index + 1) % messages.length;
}

setInterval(rotate, 3000);
window.addEventListener('DOMContentLoaded', rotate);
