// phrases to cycle through
const phrases = [
  "See live weather worldwide",
  "Animate live weather worldwide",
  "Play geography games",
  "Document your own travels"
];

let index = 0;
const container = document.getElementById("rotating-text");

function rotateText() {
  // Inject a <span> around the phrase so the CSS animation applies
  container.innerHTML = `<span>${phrases[index]}</span>`;
  index = (index + 1) % phrases.length;
}

// Wait until the DOM is fully loaded, then start rotating
document.addEventListener("DOMContentLoaded", () => {
  rotateText();                   // show the first phrase immediately
  setInterval(rotateText, 4000);  // switch every 4 seconds
});
