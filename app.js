// --- KONFIGURACJA I STAN GRY ---
const gameState = {
    // ... (twoje stare zasoby, limity, workers, buildings - bez zmian) ...
    resources: { wood: 0, food: 50 },
    limits: { wood: 100, food: 200 },
    workers: { woodcutter: 0, hunter: 0 },
    buildings: { huts: 0 },
    population: 2,
    populationLimit: 2,
    
    // ZMIANA: Zastępujemy prosty 'day' bardziej złożonym czasem
    time: {
        dayGlobal: 0,   // Całkowity czas gry
        dayInYear: 0,   // Dzień w roku (0-39)
        currentSeason: 0 // Indeks tablicy SEASONS (0=Wiosna, 1=Lato...)
    },
    
    location: {
        name: "Gęsty Las",
        trees: 500,
        initialTrees: 500, // <--- DODAJ TO (musi być równe trees)
        animals: 1000
    }
};

// --- BAZA DANYCH BIOMÓW ---
const BIOMES = [
    { name: "Las", woodMod: 1.2, foodMod: 0.8, description: "Gęste drzewa, trudne łowy." },
    { name: "Równina", woodMod: 0.6, foodMod: 1.4, description: "Dużo zwierzyny, mało drzew." },
    { name: "Dolina", woodMod: 1.0, foodMod: 1.0, description: "Zbalansowane warunki." },
    { name: "Pustkowia", woodMod: 0.5, foodMod: 0.5, description: "Trudne warunki, ale bezpiecznie." } // Tutaj w przyszłości można dodać bonusy, np. znalezione artefakty
];

const SEASONS = [
    { name: "Wiosna", foodRate: 1.0, woodRate: 1.0, desc: "Przyroda budzi się do życia." },
    { name: "Lato",   foodRate: 1.5, woodRate: 1.0, desc: "Obfitość zwierzyny i owoców." },
    { name: "Jesień", foodRate: 1.0, woodRate: 1.2, desc: "Dobre warunki do ścinki, zwierzęta migrują." },
    { name: "Zima",   foodRate: 0.5, woodRate: 0.8, desc: "Mróz. Trudno o jedzenie i drewno." }
];
// --- SILNIK GRY (TICK) ---

function tick() {
    // --- 1. OBSŁUGA CZASU ---
    gameState.time.dayGlobal++;
    gameState.time.dayInYear++;

    // Cykl roczny: Co 10 dni zmienia się pora roku
    if (gameState.time.dayInYear >= 10) {
        gameState.time.dayInYear = 0; // Resetujemy rok
        gameState.time.currentSeason++; // Następna pora
        
        if (gameState.time.currentSeason >= 4) {
            gameState.time.currentSeason = 0; // Wróć do Wiosny (Nowy Rok)
            addLog("Minął kolejny rok. Wiosna!");
        } else {
            // Logujemy zmianę pory roku
            addLog(`Nadeszła ${SEASONS[gameState.time.currentSeason].name}.`);
        }
    }

    // Pobieramy aktualne statystyki pory roku
    const seasonStats = SEASONS[gameState.time.currentSeason];


    // --- 2. PRODUKCJA (Z MODYFIKATORAMI PÓR ROKU) ---
    
    // Drewno: Mnożymy produkcję przez seasonStats.woodRate
    let potentialWood = gameState.workers.woodcutter * 1 * seasonStats.woodRate;
    let actualWood = Math.min(potentialWood, gameState.location.trees);
    gameState.location.trees -= actualWood;
    gameState.resources.wood += actualWood;
    if (gameState.resources.wood > gameState.limits.wood) gameState.resources.wood = gameState.limits.wood;

    // Jedzenie: Mnożymy produkcję przez seasonStats.foodRate
    let potentialFood = gameState.workers.hunter * 2 * seasonStats.foodRate;
    let actualFood = Math.min(potentialFood, gameState.location.animals);
    gameState.location.animals -= actualFood;
    gameState.resources.food += actualFood;
    if (gameState.resources.food > gameState.limits.food) gameState.resources.food = gameState.limits.food;

    // --- 3. KONSUMPCJA (ZIMA JEST TRUDNA) ---
    let consumptionPerPerson = 1;
    
    // Opcjonalnie: Zimą ludzie jedzą więcej, żeby się ogrzać? (Na razie zostawmy 1, żeby nie było za trudno)
    // if (seasonStats.name === "Zima") consumptionPerPerson = 1.5;

    const consumption = gameState.population * consumptionPerPerson;
    
    if (gameState.resources.food >= consumption) {
        gameState.resources.food -= consumption;
    } else {
        gameState.resources.food = 0;
        addLog("GŁÓD! Brakuje jedzenia.");
        document.body.style.backgroundColor = "#5a2d2d"; 
        setTimeout(() => document.body.style.backgroundColor = "#2c3e50", 100);
    }

    checkMigrationAvailable();
    updateUI();

    function tick() {
        // ... (cały kod logiki bez zmian) ...

        checkMigrationAvailable();
        updateUI();
        
        drawMap(); // <--- DODAJ TO! Odśwież grafikę co sekundę
    }
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

// Zmienna tymczasowa do przechowywania wylosowanych opcji
let currentScoutOptions = [];

function checkMigrationAvailable() {
    const migrateBtn = document.getElementById('btn-migrate');
    // Przycisk pojawia się, gdy kończą się zasoby
    if (gameState.location.trees <= 10 || gameState.location.animals <= 10) {
        migrateBtn.style.display = "block";
        migrateBtn.innerText = "Wyślij Zwiadowców (Koszt: 10 Jedzenia)";
        // Zmieniamy funkcję przycisku na startScouting!
        migrateBtn.onclick = startScouting; 
    } else {
        migrateBtn.style.display = "none";
        // Ukrywamy panel zwiadu jeśli zasoby są OK (np. po migracji)
        document.getElementById('scout-panel').style.display = "none";
    }
}

function startScouting() {
    const scoutCost = 10;

    if (gameState.resources.food >= scoutCost) {
        gameState.resources.food -= scoutCost;
        generateScoutOptions();
        updateUI(); // Odśwież, żeby pokazać ubytek jedzenia
    } else {
        addLog("Za mało jedzenia na wyprawę zwiadowczą!");
    }
}

function generateScoutOptions() {
    const optionsContainer = document.getElementById('scout-options');
    optionsContainer.innerHTML = ""; // Czyścimy stare opcje
    currentScoutOptions = []; // Resetujemy pamięć

    // Pokaż panel
    document.getElementById('scout-panel').style.display = "block";

    // Generujemy 3 opcje
    for (let i = 0; i < 3; i++) {
        // 1. Losujemy Biom z naszej bazy danych
        const randomBiome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
        
        // 2. Obliczamy zasoby na podstawie modyfikatorów biomu
        // Baza: 500 drzew, 800 zwierząt +/- losowość
        const trees = Math.floor((400 + Math.random() * 300) * randomBiome.woodMod);
        const animals = Math.floor((600 + Math.random() * 400) * randomBiome.foodMod);

        // 3. Zapisujemy opcję w pamięci
        const optionData = {
            name: "Nieznany " + randomBiome.name, // np. "Nieznany Las"
            biome: randomBiome.name,
            trees: trees,
            animals: animals,
            desc: randomBiome.description
        };
        currentScoutOptions.push(optionData);

        // 4. Tworzymy HTML karty (JS tworzy HTML!)
        const card = document.createElement('div');
        card.className = "scout-card";
        card.innerHTML = `
            <h4>${randomBiome.name}</h4>
            <p>${randomBiome.description}</p>
            <small>Drzewa: ~${Math.floor(trees/100)*100}</small><br>
            <small>Zwierzyna: ~${Math.floor(animals/100)*100}</small>
        `;
        
        // Kliknięcie w kartę wybiera tę opcję
        card.onclick = function() { selectLocation(i); };

        optionsContainer.appendChild(card);
    }
    
    addLog("Zwiadowcy wrócili z raportem.");
}

function selectLocation(index) {
    const choice = currentScoutOptions[index];
    
    // Ustawiamy nową lokację
    gameState.location.name = choice.name;
    gameState.location.trees = choice.trees;
    gameState.location.animals = choice.animals;

    // --- NOWOŚĆ: Tu musimy zresetować "stan początkowy" dla pniaków ---
    gameState.location.initialTrees = choice.trees; 
    // ------------------------------------------------------------------

    addLog(`--- MIGRACJA --- Wyruszyliście do: ${choice.name}`);

    // Ukrywamy panel zwiadu i przycisk
    document.getElementById('scout-panel').style.display = "none";
    document.getElementById('btn-migrate').style.display = "none";
    
    updateUI();
    // Opcjonalnie: Wymuś odrysowanie mapy natychmiast, żeby usunąć stare pniaki
    drawMap(); 
}

// --- AKTUALIZACJA UI (WIDOKU) ---

function updateUI() {
    // 1. Zasoby
    document.getElementById('current-wood').innerText = Math.floor(gameState.resources.wood);
    document.getElementById('max-wood').innerText = gameState.limits.wood;
    
    document.getElementById('current-food').innerText = Math.floor(gameState.resources.food);
    document.getElementById('max-food').innerText = gameState.limits.food;

    document.getElementById('day-counter').innerText = `Dzień: ${gameState.time.dayGlobal} (Rok: ${Math.floor(gameState.time.dayGlobal / 40) + 1})`;
    
    // Nowy wskaźnik pory roku
    const currentSeason = SEASONS[gameState.time.currentSeason];
    const seasonEl = document.getElementById('season-display');
    seasonEl.innerText = `${currentSeason.name} (${currentSeason.desc})`;

    // Wizualny bajer dla grafika: Zmiana koloru tekstu w zależności od pory roku
    if (currentSeason.name === "Wiosna") seasonEl.style.color = "#2ecc71"; // Zieleń
    if (currentSeason.name === "Lato")   seasonEl.style.color = "#f1c40f"; // Żółty
    if (currentSeason.name === "Jesień") seasonEl.style.color = "#e67e22"; // Pomarańcz
    if (currentSeason.name === "Zima")   seasonEl.style.color = "#3498db"; // Niebieski
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
    // ZMIANA: Używamy gameState.time.dayGlobal zamiast gameState.day
    const currentDay = gameState.time ? gameState.time.dayGlobal : 0;
    
    logElement.innerHTML = `<p><strong>Dzień ${currentDay}:</strong> ${message}</p>` + logElement.innerHTML;
}

// Startowe odświeżenie widoku
updateUI();

// --- SYSTEM GRAFICZNY (CANVAS) ---

const canvas = document.getElementById('game-map');
const ctx = canvas.getContext('2d'); // To jest nasz "pędzel"

// Funkcja rysująca mapę (Wizualizacja danych)
function drawMap() {
    // 1. Czyścimy ekran (Kluczowe!)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Tło (Pory roku)
    const season = SEASONS[gameState.time.currentSeason].name;
    if (season === "Zima") {
        ctx.fillStyle = "#dfe6e9"; 
    } else if (season === "Jesień") {
        ctx.fillStyle = "#5d4037"; 
    } else if (season === "Wiosna") {
        ctx.fillStyle = "#27ae60"; 
    } else {
        ctx.fillStyle = "#1e8449"; 
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Rysowanie Lasu (Drzewa i Pniaki)
    // Jeśli nie mamy zapisanego initialTrees (np. start gry), używamy obecnych
    const maxTrees = gameState.location.initialTrees || gameState.location.trees;
    const currentTrees = gameState.location.trees;

    // Rysujemy WSZYSTKIE obiekty (i żywe, i ścięte)
    // Dzięki temu mapa jest stabilna i nie miga
    for (let i = 0; i < maxTrees; i++) {
        // Generujemy pozycję dla drzewa nr "i"
        // Używamy tego samego "chaotycznego" wzoru co wcześniej
        let randomX = Math.sin(3456 + i * 12.9898) * 43758.5453;
        let x = (randomX - Math.floor(randomX)) * canvas.width;

        let randomY = Math.cos(3456 + i * 78.233) * 43758.5453;
        let y = (randomY - Math.floor(randomY)) * canvas.height;

        // DECYZJA: Czy to drzewo jeszcze istnieje?
        // Jeśli index 'i' jest mniejszy niż liczba obecnych drzew -> Rysuj Drzewo
        // W przeciwnym razie -> Rysuj Pniak
        if (i < currentTrees) {
            // Żywe drzewo
            ctx.fillStyle = (season === "Zima") ? "#2d3436" : "#004d00";
            ctx.fillRect(x, y, 3, 3); // Zwiększyłem do 3px dla lepszej widoczności
        } else {
            // Pniak (Ścięte)
            ctx.fillStyle = "#8d6e63"; // Jasny brąz
            ctx.fillRect(x, y, 2, 2); // Pniaki są mniejsze
        }
    }

    // 4. Zwierzyna (Tutaj zostawiamy po staremu - znikają)
    ctx.fillStyle = "#e74c3c";
    // Zwiększamy kropki zwierząt
    drawScatteredDots(gameState.location.animals, 7890, 3); 
    
    // 5. Osada
    ctx.fillStyle = "#f1c40f";
    const villageSize = 8 + gameState.population; // Startowa wielkość + ludzie
    ctx.fillRect((canvas.width/2) - (villageSize/2), (canvas.height/2) - (villageSize/2), villageSize, villageSize);
}

// Zaktualizowana funkcja pomocnicza (dodałem parametr 'size')
function drawScatteredDots(count, seed, size = 2) {
    for (let i = 0; i < count; i++) {
        let randomX = Math.sin(seed + i * 12.9898) * 43758.5453;
        let x = (randomX - Math.floor(randomX)) * canvas.width;
        let randomY = Math.cos(seed + i * 78.233) * 43758.5453;
        let y = (randomY - Math.floor(randomY)) * canvas.height;
        
        ctx.fillRect(x, y, size, size);
    }
}

// Funkcja pomocnicza do rozsypywania kropek
// count = ile kropek narysować
// seed = liczba, która sprawia, że układ jest stały
function drawScatteredDots(count, seed) {
    for (let i = 0; i < count; i++) {
        // ZMIANA: Mnożymy 'i' przez duże, "brzydkie" liczby.
        // To sprawia, że wynik skacze chaotycznie po ekranie zamiast płynąć.
        
        // Wzór na pseudo-losowość (zamiast prostego sinusa)
        let randomX = Math.sin(seed + i * 12.9898) * 43758.5453;
        let x = (randomX - Math.floor(randomX)) * canvas.width;

        let randomY = Math.cos(seed + i * 78.233) * 43758.5453;
        let y = (randomY - Math.floor(randomY)) * canvas.height;
        
        ctx.fillRect(x, y, 2, 2);
    }
}

updateUI();
drawMap(); // <--- I TU TEŻ (na start)