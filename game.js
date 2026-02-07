// game.js

// 1. Selezione del giocatore del giorno, stabile per 24h
function getDailyPlayer(players) {
  const now = new Date();
  // chiave basata su data (YYYY-MM-DD)
  const key = now.toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed += key.charCodeAt(i);
  }
  const index = seed % players.length;
  return players[index];
}

const TARGET_PLAYER = getDailyPlayer(PLAYERS);

const inputEl = document.getElementById("player-input");
const guessBtn = document.getElementById("guess-btn");
const suggestionsEl = document.getElementById("suggestions");
const tableBody = document.getElementById("guesses-body");
const resultMessage = document.getElementById("result-message");

let gameEnded = false;
let guesses = [];

// 2. Autocomplete semplice per i nomi
function updateSuggestions() {
  const term = inputEl.value.trim().toLowerCase();
  suggestionsEl.innerHTML = "";
  if (!term) return;

  const matches = PLAYERS
    .filter(p => p.name.toLowerCase().includes(term))
    .slice(0, 8);

  if (!matches.length) return;

  const ul = document.createElement("ul");
  ul.className = "suggestions-list";

  matches.forEach(player => {
    const li = document.createElement("li");
    li.textContent = player.name;

    const meta = document.createElement("span");
    meta.className = "suggestion-meta";
    meta.textContent = `${player.nationality} · ${player.role}`;
    li.appendChild(meta);

    li.addEventListener("click", () => {
      inputEl.value = player.name;
      suggestionsEl.innerHTML = "";
      inputEl.focus();
    });
    ul.appendChild(li);
  });

  suggestionsEl.appendChild(ul);
}

// 3. Logica dei confronti

function compareFoot(guess, target) {
  if (guess === target) return "exact";
  // parziale se uno dei due è "ENTRAMBI"
  if (guess === "ENTRAMBI" || target === "ENTRAMBI") return "partial";
  return "none";
}

function compareNationality(guess, target) {
  return guess === target ? "exact" : "none";
}

function compareRole(guess, target) {
  return guess === target ? "exact" : "none";
}

function compareTrophies(guessArr, targetArr) {
  const guessSet = new Set(guessArr);
  const targetSet = new Set(targetArr);
  let common = 0;
  guessSet.forEach(t => {
    if (targetSet.has(t)) common++;
  });
  if (common === targetSet.size && targetSet.size === guessSet.size) return "exact";
  if (common > 0) return "partial";
  return "none";
}

function compareNumber(guessVal, targetVal) {
  if (guessVal === targetVal) return { status: "exact", arrow: "" };
  const arrow = guessVal < targetVal ? "↑" : "↓";
  return { status: "none", arrow };
}

// 4. Costruzione cella con colore + freccia

function createStatTile(text, status, arrow = "") {
  const div = document.createElement("div");
  div.className = "stat-tile";

  if (status === "exact") div.classList.add("tile-green");
  else if (status === "partial") div.classList.add("tile-orange");
  else div.classList.add("tile-red");

  div.textContent = text;
  if (arrow) {
    const span = document.createElement("span");
    span.className = "arrow";
    span.textContent = arrow;
    div.appendChild(span);
  }
  return div;
}

// 5. Gestione tentativo

function handleGuess() {
  if (gameEnded) return;

  const name = inputEl.value.trim();
  if (!name) return;

  const player = PLAYERS.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
  if (!player) {
    showMessage("Calciatore non trovato nel database.", "fail");
    return;
  }

  // evita di ripetere lo stesso nome
  if (guesses.includes(player.id)) {
    showMessage("Hai già provato questo calciatore.", "fail");
    return;
  }

  guesses.push(player.id);
  suggestionsEl.innerHTML = "";
  inputEl.value = "";

  addGuessRow(player);

  if (player.id === TARGET_PLAYER.id) {
    gameEnded = true;
    showMessage(`Bravo! Il calciatore del giorno era ${TARGET_PLAYER.name}.`, "success");
  } else if (guesses.length >= 8) {
    gameEnded = true;
    showMessage(`Tentativi finiti. Il calciatore del giorno era ${TARGET_PLAYER.name}.`, "fail");
  } else {
    showMessage(`Continua a provare, hai usato ${guesses.length} tentativi.`, "neutral");
  }
}

function addGuessRow(player) {
  const tr = document.createElement("tr");

  // colonna calciatore
  const tdPlayer = document.createElement("td");
  tdPlayer.className = "player-cell";

  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "player-avatar";

  if (player.image) {
    const img = document.createElement("img");
    img.src = player.image;
    img.alt = player.name;
    avatarWrapper.appendChild(img);
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "player-name";
  nameSpan.textContent = player.name;

  tdPlayer.appendChild(avatarWrapper);
  tdPlayer.appendChild(nameSpan);
  tr.appendChild(tdPlayer);

  // piede
  const footStatus = compareFoot(player.foot, TARGET_PLAYER.foot);
  const tdFoot = document.createElement("td");
  tdFoot.appendChild(createStatTile(player.foot, footStatus));
  tr.appendChild(tdFoot);

  // nazionalità
  const natStatus = compareNationality(player.nationality, TARGET_PLAYER.nationality);
  const tdNat = document.createElement("td");
  tdNat.appendChild(createStatTile(player.nationality, natStatus));
  tr.appendChild(tdNat);

  // ruolo
  const roleStatus = compareRole(player.role, TARGET_PLAYER.role);
  const tdRole = document.createElement("td");
  tdRole.appendChild(createStatTile(player.role, roleStatus));
  tr.appendChild(tdRole);

  // trofei
  const trophiesStatus = compareTrophies(player.trophies, TARGET_PLAYER.trophies);
  const tdTrophy = document.createElement("td");
  tdTrophy.appendChild(
    createStatTile(player.trophies.join(", "), trophiesStatus)
  );
  tr.appendChild(tdTrophy);

  // altezza
  const heightCmp = compareNumber(player.height, TARGET_PLAYER.height);
  const tdHeight = document.createElement("td");
  tdHeight.appendChild(
    createStatTile(player.height + " cm", heightCmp.status, heightCmp.arrow)
  );
  tr.appendChild(tdHeight);

  // gol
  const goalsCmp = compareNumber(player.careerGoals, TARGET_PLAYER.careerGoals);
  const tdGoals = document.createElement("td");
  tdGoals.appendChild(
    createStatTile(player.careerGoals.toString(), goalsCmp.status, goalsCmp.arrow)
  );
  tr.appendChild(tdGoals);

  tableBody.prepend(tr);
}

// 6. Messaggi

function showMessage(text, type) {
  resultMessage.textContent = text;
  resultMessage.classList.remove("hidden", "success", "fail");
  if (type === "success") resultMessage.classList.add("success");
  else if (type === "fail") resultMessage.classList.add("fail");
}

// 7. Event listeners

guessBtn.addEventListener("click", handleGuess);
inputEl.addEventListener("keyup", e => {
  updateSuggestions();
  if (e.key === "Enter") {
    handleGuess();
  }
});
inputEl.addEventListener("input", updateSuggestions);
document.addEventListener("click", e => {
  if (!suggestionsEl.contains(e.target) && e.target !== inputEl) {
    suggestionsEl.innerHTML = "";
  }
});
