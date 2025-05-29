const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const buttonGrid = document.getElementById("buttonGrid");
const diceContainer = document.getElementById("diceContainer");
const targetBox = document.getElementById("targetBox");
const submitBtn = document.getElementById("submitBtn");
const dropdown = document.getElementById("gameDropdown");
const dailyBestScoreBox = document.getElementById("dailyBestScore");
const completionRatioBox = document.getElementById("completionRatio");
const masterScoreBox = document.getElementById("masterScore");
const gameNumberDate = document.getElementById("gameNumberDate");
const qu0xAnimation = document.getElementById("qu0xAnimation");
const diceTypeSelector = document.getElementById("diceType"); // assumes dropdown exists in HTML
let diceType = 6; // default to D6 on page load

let currentDate = new Date();
let currentDay = getDayIndex(currentDate);
let maxDay = getDayIndex(new Date());
let usedDice = [];
let diceValues = [];
let target = null;
let lockedDays = JSON.parse(localStorage.getItem("lockedDays") || "{}");
let bestScores = JSON.parse(localStorage.getItem("bestScores") || "{}");

const colorBoxes = {
  "1": "🟥", // red box for 1
  "2": "⬜", // white box for 2
  "3": "🟦", // blue box for 3
  "4": "🟨", // yellow box for 4
  "5": "🟩", // green box for 5
  "6": "⬛", // black box for 6
};

function expressionToShareable(expr) {
  return expr.replace(/\d/g, d => colorBoxes[d] || d);
}

function getDayIndex(date) {
  const start = new Date("2025-05-15T00:00:00");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}


// Example PRNG and hash
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getDateFromDayIndex(index) {
  const start = new Date("2025-05-15T00:00:00");
  const date = new Date(start.getTime() + index * 86400000);
  return date.toISOString().slice(0, 10);
}

// Step 1: Define the static puzzles for the first 10 days
const staticPuzzles = [
  { dice: [3, 2, 5, 1, 1], target: 82 },
  { dice: [6, 3, 2, 4, 3], target: 46 },
  { dice: [2, 6, 2, 5, 4], target: 93 },
  { dice: [1, 6, 6, 3, 3], target: 44 },
  { dice: [1, 5, 4, 3, 2], target: 76 },
  { dice: [4, 2, 6, 3, 5], target: 4 },
  { dice: [1, 6, 4, 4, 3], target: 4 },
  { dice: [6,3, 1, 6, 1], target: 19 },
  { dice: [3, 1, 1, 3, 5], target: 73 },
  { dice: [3, 1, 3, 2, 6], target: 31 },
  { dice: [4, 5, 5, 3, 2], target: 52 },
];

// Optional: use mulberry32 PRNG for dynamic puzzles from day 10 onward
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePuzzle(day) {
  const puzzle = staticPuzzles[day];
  if (puzzle) {
    diceValues = puzzle.dice;
    target = puzzle.target;
  } else {
    // fallback or procedurally generate
    const seed = day + 1;
    diceValues = generateDice(seed);
    target = generateTarget(diceValues, seed);
  }
}


function renderDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.classList.add("die");
    die.dataset.index = idx;
    die.innerText = val;
    die.style = getDieStyle(val);
    if (usedDice.includes(idx)) {
      die.classList.add("faded");
    }
    die.onclick = () => {
      if (isLocked(currentDay)) return;
      if (usedDice.includes(idx)) return;
      usedDice.push(idx);
      expressionBox.innerText += val;
      die.classList.add("faded");
      evaluateExpression();
    };
    diceContainer.appendChild(die);
  });
}

function getDieStyle(val) {
  const styles = {
    1:  "color:white; background:red;",
    2:  "color:black; background:white;",
    3:  "color:white; background:blue;",
    4:  "color:black; background:yellow;",
    5:  "color:white; background:green;",
    6:  "color:yellow; background:black;",
    7:  "color:black; background:orange;",
    8:  "color:black; background:pink;",
    9:  "color:black; background:turquoise;",
    10: "color:white; background:purple;",
    11: "color:red; background:gray;",
    12: "color:black; background:limegreen;",
  };
  const border = "border: 2px solid black; border-radius: 6px; padding: 10px; margin: 5px;";
  return (styles[val] || "color:black; background:white;") + border;
}


function addToExpression(char) {
  const expr = expressionBox.innerText;
  const lastChar = expr.slice(-1);

  // Define what counts as a number character (digits)
  const isDigit = c => /\d/.test(c);

  // If char is a digit (from dice):
  if (isDigit(char)) {
    // If last char is also a digit, add a space before adding new digit to prevent concatenation
    if (isDigit(lastChar)) {
      expressionBox.innerText += ' ' + char;
    } else {
      expressionBox.innerText += char;
    }
  } else {
    // For operators and parentheses, append directly
    expressionBox.innerText += char;
  }

  evaluateExpression();
}

function quadrupleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid quadruple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 4) {
    product *= i;
  }
  return product;
}

function quintupleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid quintuple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 5) {
    product *= i;
  }
  return product;
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid double factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 2) {
    product *= i;
  }
  return product;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid triple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 3) {
    product *= i;
  }
  return product;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function evaluateExpression() {
  const expr = expressionBox.innerText.trim();
  if (expr.length === 0) {
    evaluationBox.innerText = "?";
    return;
  }
  try {
    let replaced = expr;

    // Quintuple factorial e.g. 5!!!!! or (2+3)!!!!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!!!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      return quintupleFactorial(n);
    });

    // Quadruple factorial e.g. 6!!!! or (3+1)!!!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      return quadrupleFactorial(n);
    });

    // Triple factorial e.g. 5!!! or (2+1)!!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      return tripleFactorial(n);
    });

    // Double factorial e.g. 4!! or (3+1)!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      return doubleFactorial(n);
    });

    // Single factorial e.g. 3! or (4)!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      return factorial(n);
    });

    // Replace ^ with **
    replaced = replaced.replace(/\^/g, "**");

    let result = eval(replaced);
    evaluationBox.innerText = result;
  } catch {
    evaluationBox.innerText = "?";
  }
}


function buildButtons() {
  const ops = ["+", "-", "*", "/", "^", "!", "(", ")", "Back", "Clear"];
  buttonGrid.innerHTML = "";


  ops.forEach(op => {
    const btn = document.createElement("button");
    btn.innerText = op;
    btn.onclick = () => {
      if (isLocked(currentDay)) return;
      if (op === "Back") {
        let expr = expressionBox.innerText;
        if (expr.length === 0) return;
        const removed = expr[expr.length - 1];
        expressionBox.innerText = expr.slice(0, -1);
        const idx = usedDice.findLast(i => diceValues[i].toString() === removed);
        if (idx !== undefined) {
          usedDice = usedDice.filter(i => i !== idx);
          document.querySelector(`.die[data-index="${idx}"]`).classList.remove("faded");
        }
      } else if (op === "Clear") {
        expressionBox.innerText = "";
        usedDice = [];
        renderDice();
      } else {
        addToExpression(op);
      }
      evaluateExpression();
    };
    buttonGrid.appendChild(btn);
  });
}

function isLocked(day) {
  return lockedDays[day]?.score === 0;
}

diceTypeSelector.addEventListener("change", () => {
  diceType = parseInt(diceTypeSelector.value, 10);
  usedDice = [];
  renderGame(currentDay);
});

function submit() {
  if (isLocked(currentDay)) return;

  const result = evaluationBox.innerText;
  if (result === "?") {
    alert("Invalid Submission");
    return;
  }
  if (!Number.isInteger(Number(result))) {
  alert("Submission must be an integer result.");
  return;
  }
  if (usedDice.length !== 5) {
    alert("You must use all 5 dice.");
    return;
  }

  const score = Math.abs(Number(result) - target);
  if (!(currentDay in bestScores) || score < bestScores[currentDay]) {
    bestScores[currentDay] = score;
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
  }

 if (score === 0) {
  lockedDays[currentDay] = { score, expression: expressionBox.innerText };
  localStorage.setItem("lockedDays", JSON.stringify(lockedDays));
  animateQu0x();

  // ✅ Show the Share button
  document.getElementById("shareBtn").classList.remove("hidden");
}

  renderGame(currentDay);
}

function animateQu0x() {
  qu0xAnimation.classList.remove("hidden");
  setTimeout(() => {
    qu0xAnimation.classList.add("hidden");
  }, 3000);
}

function renderGame(day) {
  currentDay = day;

  generatePuzzle(day);
  renderDice();

  if (lockedDays[day] && lockedDays[day].expression) {
    expressionBox.innerText = lockedDays[day].expression;
    evaluateExpression();
  } else {
    expressionBox.innerText = "";
    evaluationBox.innerText = "?";
  }

  targetBox.innerText = `Target: ${target}`;
  gameNumberDate.innerText = `Game #${day + 1} (${getDateFromDayIndex(day)})`;

  if (bestScores[day] !== undefined) {
    dailyBestScoreBox.innerText = `${bestScores[day]}`;
  } else {
    dailyBestScoreBox.innerText = "N/A";
  }

  const completedDays = Object.values(bestScores).filter(score => score === 0).length;
  completionRatioBox.innerText = `${completedDays}/${maxDay + 1}`;

  const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
  const totalGames = maxDay + 1;

  if (Object.keys(bestScores).length === totalGames) {
    masterScoreBox.innerText = `${totalScore}`;
  } else {
    masterScoreBox.innerText = "N/A";
  }


  const locked = isLocked(day);

  expressionBox.style.pointerEvents = locked ? "none" : "auto";
  submitBtn.disabled = locked;

  // Disable or enable all operator buttons
  buttonGrid.querySelectorAll("button").forEach(btn => {
    btn.disabled = locked;
    if (locked) {
      btn.classList.add("disabled");
    } else {
      btn.classList.remove("disabled");
    }
  });

  // Hide or show Share button
  const shareBtn = document.getElementById("shareBtn");
  if (locked && lockedDays[day]?.expression) {
    shareBtn.classList.remove("hidden");
  } else {
    shareBtn.classList.add("hidden");
  }
}

document.getElementById("prevDay").onclick = () => {
  if (currentDay > 0) {
    currentDay--;
    renderGame(currentDay);
    populateDropdown();
  }
};

document.getElementById("nextDay").onclick = () => {
  if (currentDay < maxDay) {
    currentDay++;
    renderGame(currentDay);
    populateDropdown();
  }
};

function populateDropdown() {
  dropdown.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const option = document.createElement("option");
    option.value = i;
    
    // Option text, you can customize with emojis or formatting
    option.text = `Game #${i + 1}`;
    
    // Mark locked games with a star emoji in option text
    if (lockedDays[i] && lockedDays[i].score === 0) {
      option.text = "⭐ " + option.text;
    }

    dropdown.appendChild(option);
  }
  // Set the dropdown value to the currentDay so UI matches the current game
  dropdown.value = currentDay;
}

// Add event listener to handle selection change
dropdown.addEventListener("change", (e) => {
  const selectedDay = Number(e.target.value);
  if (selectedDay >= 0 && selectedDay <= maxDay) {
    renderGame(selectedDay);
  }
});

submitBtn.addEventListener("click", submit);

// Initialize buttons, dropdown, and render current game on page load
buildButtons();
populateDropdown();
renderGame(currentDay);

document.getElementById("shareBtn").addEventListener("click", () => {
  const gameNumber = currentDay + 1;  // game number = day index + 1
  const expression = expressionBox.innerText;
  const shareableExpr = expressionToShareable(expression);

  const shareText = `Qu0x! ${gameNumber}: ${shareableExpr}`;

  navigator.clipboard.writeText(shareText).then(() => {
    alert("Copied your Qu0x! expression to clipboard!");
  });
});
