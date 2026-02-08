// game.js - VERSIONE PERSISTENTE CON LOCALSTORAGE (reset giornaliero automatico)

// 1. Funzioni LocalStorage con reset giornaliero
function getStorageKey() {
  return `dailyGame_${new Date().toISOString().slice(0, 10)}`; // "dailyGame_2026-02-07"
}

function loadGameState() {
  const key = getStorageKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      // Verifica validità (stesso giorno)
      if (state.dailyKey === key.replace('dailyGame_', '')) {
        console.log('🎮 Partita ripristinata da localStorage!');
        return state;
      }
    } catch (e) {
      console.warn('Dati corrotti, reset partita');
    }
  }
  return null;
}

function saveGameState() {
  const key = getStorageKey();
  const state = {
    dailyKey: key.replace('dailyGame_', ''),
    targetPlayerId: TARGET_PLAYER.id,
    guesses: guesses,
    gameEnded: gameEnded
  };
  localStorage.setItem(key, JSON.stringify(state));
  console.log('💾 Stato salvato');
}

// 2. Selezione del giocatore del giorno, stabile per 24h (INVARIATA)
function getDailyPlayer(players) {
  const now = new Date();
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

// 3. INIZIALIZZAZIONE CON RESTORE AUTOMATICO
const savedState = loadGameState();
if (savedState) {
  gameEnded = savedState.gameEnded;
  guesses = savedState.guesses || [];
  
  // Ricostruisci tabella tentativi precedenti
  guesses.forEach(playerId => {
    const player = PLAYERS.find(p => p.id === playerId);
    if (player) {
      addGuessRow(player);
    }
  });
  
  // Mostra stato se partita finita
  if (gameEnded) {
    const targetName = PLAYERS.find(p => p.id === savedState.targetPlayerId)?.name || 'Sconosciuto';
    const status = guesses.includes(TARGET_PLAYER.id) ? 'success' : 'fail';
    showMessage(`Partita completata! Era ${targetName} (${guesses.length}/8 tentativi)`, status);
    guessBtn.disabled = true;
    guessBtn.textContent = 'Partita finita!';
  } 
} else {
  console.log('🆕 Nuova partita oggi!');
}

// FUNZIONI IDENTICHE (2-6)
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

function compareFoot(guess, target) {
  if (guess === target) return "exact";
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

function compareSpeciality(guess, target) {
  return guess === target ? "exact" : "none";
}

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

// 7. handleGuess() MODIFICATO - salva dopo ogni tentativo
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

  if (guesses.includes(player.id)) {
    showMessage("Hai già provato questo calciatore.", "fail");
    return;
  }

  guesses.push(player.id);
  suggestionsEl.innerHTML = "";
  inputEl.value = "";

  addGuessRow(player);

  // SALVA STATO DOPO OGNI TENTATIVO
  saveGameState();

  if (player.id === TARGET_PLAYER.id) {
    gameEnded = true;
        resultMessage.classList.add("hidden");
    resultMessage.textContent = "";
    setTimeout(() => {
      showMessage(`🎉 Bravo! Il calciatore del giorno era ${TARGET_PLAYER.name}!`, "success");
    }, 3000);
    guessBtn.disabled = true;
    guessBtn.textContent = 'Vinto!';
  } 
}

function addGuessRow(player) {
  const tr = document.createElement("tr");

  // colonna calciatore (IDENTICA)
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
  tdFoot.className = "stat-cell";
  tdFoot.appendChild(createStatTile(player.foot, footStatus));
  tr.appendChild(tdFoot);

  // nazionalità
  const natStatus = compareNationality(player.nationality, TARGET_PLAYER.nationality);
  const tdNat = document.createElement("td");
  tdNat.className = "stat-cell";
  tdNat.appendChild(createStatTile(player.nationality, natStatus));
  tr.appendChild(tdNat);

  // ruolo
  const roleStatus = compareRole(player.role, TARGET_PLAYER.role);
  const tdRole = document.createElement("td");
  tdRole.className = "stat-cell";
  tdRole.appendChild(createStatTile(player.role, roleStatus));
  tr.appendChild(tdRole);

  // specialità
  const specStatus = compareSpeciality(player.speciality, TARGET_PLAYER.speciality);
  const tdSpec = document.createElement("td");
  tdSpec.className = "stat-cell";
  tdSpec.appendChild(createStatTile(player.speciality, specStatus));
  tr.appendChild(tdSpec);

  // trofei
  const trophiesStatus = compareTrophies(player.trophies, TARGET_PLAYER.trophies);
  const tdTrophy = document.createElement("td");
  tdTrophy.className = "stat-cell";
  tdTrophy.appendChild(
    createStatTile(player.trophies.join(", "), trophiesStatus)
  );
  tr.appendChild(tdTrophy);

  // altezza
  const heightCmp = compareNumber(player.height, TARGET_PLAYER.height);
  const tdHeight = document.createElement("td");
  tdHeight.className = "stat-cell";
  tdHeight.appendChild(
    createStatTile(player.height + " cm", heightCmp.status, heightCmp.arrow)
  );
  tr.appendChild(tdHeight);

  // gol
  const goalsCmp = compareNumber(player.careerGoals, TARGET_PLAYER.careerGoals);
  const tdGoals = document.createElement("td");
  tdGoals.className = "stat-cell";
  tdGoals.appendChild(
    createStatTile(player.careerGoals.toString(), goalsCmp.status, goalsCmp.arrow)
  );
  tr.appendChild(tdGoals);

  tableBody.prepend(tr);
}

function showMessage(text, type) {
  resultMessage.textContent = text;
  resultMessage.classList.remove("hidden", "success", "fail", "neutral");
  if (type === "success") resultMessage.classList.add("success");
  else if (type === "fail") resultMessage.classList.add("fail");
}

// 8. Event listeners (IDENTICI)
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

console.log('🚀 game.js caricato - Persistenza attiva!');
