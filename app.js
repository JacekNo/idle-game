// --- KONFIGURACJA I STAN GRY ---
const gameState = {
    resources: {
        wood: 0,
        food: 50
    },
    limits: {
        wood: 100, 
        food: 200
    },
    workers: {
        woodcutter: 0,
        hunter: 0
    },
    buildings: {
        huts: 0
    },
    population: 2,
    populationLimit: 2, // Start: 2
    
    day: 0,
    
    location: {
        name: "Gęsty Las",
        trees: 500,
        animals: 1000
    }
};

// --- SILNIK GRY (TICK) ---

function tick() {
    gameState.day++;

    // --- 1. PRODUKCJA (Z WYCZERPYWANIEM) ---
    
    // Drewno
    let potentialWood = gameState.workers.woodcutter * 1;
    let actualWood = Math.min(potentialWood, gameState.location.trees);
    gameState.location.trees -= actualWood;
    gameState.resources.wood += actualWood;
    if (gameState.resources.wood > gameState.limits.wood) gameState.resources.wood = gameState.limits.wood;

    // Jedzenie
    let potentialFood = gameState.workers.hunter * 2;
    let actualFood = Math.min(potentialFood, gameState.location.animals);
    gameState.location.animals -= actualFood;
    gameState.resources.food += actualFood;
    if (gameState.resources.food > gameState.limits.food) gameState.resources.food = gameState.limits.food;

    // --- 2. KONSUMPCJA ---
    const consumption = gameState.population * 1;
    if (gameState.resources.food >= consumption) {
        gameState.resources.food -= consumption;
    } else {
        gameState.resources.food = 0;
        addLog("GŁÓD! Brakuje jedzenia.");
        // Opcjonalny efekt wizualny głodu
        document.body.style.backgroundColor = "#5a2d2d"; 
        setTimeout(() => document.body.style.backgroundColor = "#2c3e50", 100);
    }

    checkMigrationAvailable();
    updateUI();
}

// Uruchomienie pętli (co 1000ms)
setInterval(tick, 1000);

// --- FUNKCJE ROZWOJU (BUDYNKI I REKRUTACJA) ---

function buildHut() {
    const cost = 50;
    
    if (gameState.resources.wood >= cost) {
        gameState.resources.wood -= cost;
        gameState.buildings.huts++;
        gameState.populationLimit += 2; // Szałas daje +2 miejsca
        
        addLog("Zbudowano szałas! Mamy więcej miejsca.");
        updateUI();
    } else {
        addLog("Za mało drewna!");
    }
}

function recruitSettler() {
    const foodCost = 50;

    if (gameState.population >= gameState.populationLimit) {
        addLog("Brak miejsc w osadzie! Zbuduj szałas.");
        return;
    }

    if (gameState.resources.food >= foodCost) {
        gameState.resources.food -= foodCost;
        gameState.population++;
        addLog("Nowy osadnik dołączył do osady.");
        updateUI();
    } else {
        addLog("Za mało jedzenia.");
    }
}

// --- ZARZĄDZANIE PRACOWNIKAMI ---

function getUnemployed() {
    const employed = gameState.workers.woodcutter + gameState.workers.hunter;
    return gameState.population - employed;
}

function assignWorker(job) {
    if (getUnemployed() > 0) {
        gameState.workers[job]++;
        addLog("Przypisano osadnika do: " + job);
        updateUI();
    } else {
        addLog("Brak rąk do pracy!");
    }
}

function removeWorker(job) {
    if (gameState.workers[job] > 0) {
        gameState.workers[job]--;
        addLog("Odebrano osadnika z: " + job);
        updateUI();
    }
}

// --- MECHANIKA MIGRACJI ---

function checkMigrationAvailable() {
    const migrateBtn = document.getElementById('btn-migrate');
    // Pokaż przycisk tylko gdy skończą się zasoby
    if (gameState.location.trees <= 0 || gameState.location.animals <= 0) {
        migrateBtn.style.display = "block";
        migrateBtn.innerText = "Zasoby wyczerpane! Migruj!";
    } else {
        migrateBtn.style.display = "none";
    }
}

function migrate() {
    gameState.location.trees = Math.floor(Math.random() * 500) + 200;
    gameState.location.animals = Math.floor(Math.random() * 800) + 200;
    
    const prefixes = ["Mroczny", "Odległy", "Zielony", "Martwy", "Cichy", "Wietrzny"];
    const suffixes = ["Las", "Bór", "Gaj", "Dolina", "Wzgórze", "Step"];
    const randomName = prefixes[Math.floor(Math.random() * prefixes.length)] + " " + suffixes[Math.floor(Math.random() * suffixes.length)];
    
    gameState.location.name = randomName;

    addLog(`--- MIGRACJA --- Dotarliście do: ${randomName}`);
    updateUI();
}

// --- AKTUALIZACJA UI (WIDOKU) ---

function updateUI() {
    // 1. Zasoby
    document.getElementById('current-wood').innerText = Math.floor(gameState.resources.wood);
    document.getElementById('max-wood').innerText = gameState.limits.wood;
    
    document.getElementById('current-food').innerText = Math.floor(gameState.resources.food);
    document.getElementById('max-food').innerText = gameState.limits.food;

    document.getElementById('day-counter').innerText = 'Dzień: ' + gameState.day;
    
    // 2. Pracownicy
    document.getElementById('unemployed-count').innerText = getUnemployed();
    document.getElementById('woodcutter-count').innerText = gameState.workers.woodcutter;
    document.getElementById('hunter-count').innerText = gameState.workers.hunter;

    // 3. Lokacja
    document.getElementById('loc-name').innerText = gameState.location.name;
    document.getElementById('loc-wood').innerText = Math.floor(gameState.location.trees);
    document.getElementById('loc-animals').innerText = Math.floor(gameState.location.animals);
    
    // 4. Populacja i Budynki
    document.getElementById('pop-current').innerText = gameState.population;
    document.getElementById('pop-limit').innerText = gameState.populationLimit;
    document.getElementById('hut-count').innerText = gameState.buildings.huts;
}

function addLog(message) {
    const logElement = document.getElementById('game-log');
    logElement.innerHTML = `<p>${gameState.day}: ${message}</p>` + logElement.innerHTML;
}

// Startowe odświeżenie widoku
updateUI();