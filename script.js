// GAME STATE VARIABLES
let money = 0;
let incomePerSec = 1; // $ per second (base)
let skyscraperCount = 0, carCount = 0, workerCount = 0;
let skyscraperCost = 100, carCost = 200, workerCost = 50;
const costMultiplier = 1.15;

let workersUpgraded = false;
let carsUpgraded = false;
let rebirthCount = 0;

// Time and Job Variables
const dayLengthSeconds = 20 * 60;  // 20 minutes in seconds (for testing you might shorten this)
const nightLengthSeconds = 5 * 60; // 5 minutes (night)
let totalSeconds = 0;
let currentDayIndex = 0;
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let jobActive = false;
let jobStartTime = 0;
let currentJob = "";

// Arrays for random icon classes
const skyscraperClasses = ['skyscraper1', 'skyscraper2', 'skyscraper3'];
const carClasses = ['car1', 'car2', 'car3'];
const workerClasses = ['worker1', 'worker2', 'worker3'];

// Arrays to hold moving elements
let cars = [];       // for car objects { elem, vx, vy }
let workersArray = []; // for worker objects { elem, vx, vy }

// Initialize game (load saved state if any)
function initGame() {
  loadGame();
  updateStatusBar();
  // Start the game logic loop and animation loop
  startGameLogicLoop();
  startAnimationLoop();
}
  
// Purchase functionality for skyscraper, car, or worker
function buy(type) {
  if (type === 'skyscraper' && money >= skyscraperCost) {
    money -= skyscraperCost;
    skyscraperCount++;
    incomePerSec += 10;
    skyscraperCost = Math.floor(skyscraperCost * costMultiplier);
    document.getElementById('money').textContent = money;
    document.getElementById('skyscraperCost').textContent = skyscraperCost;
    addBuildingToMap();
  }
  else if (type === 'car' && money >= carCost) {
    money -= carCost;
    carCount++;
    incomePerSec += 5;
    carCost = Math.floor(carCost * costMultiplier);
    document.getElementById('money').textContent = money;
    document.getElementById('carCost').textContent = carCost;
    addCarToMap();
  }
  else if (type === 'worker' && money >= workerCost) {
    money -= workerCost;
    workerCount++;
    incomePerSec += 1;
    workerCost = Math.floor(workerCost * costMultiplier);
    document.getElementById('money').textContent = money;
    document.getElementById('workerCost').textContent = workerCost;
    addWorkerToMap();
  }
  // Enable upgrade buttons if conditions are met
  if (!workersUpgraded && workerCount >= 5) {
    document.getElementById('upgradeWorkersBtn').disabled = false;
  }
  if (!carsUpgraded && carCount >= 3) {
    document.getElementById('upgradeCarsBtn').disabled = false;
  }
  saveGame();
}

// Add a skyscraper with a random style to the map
function addBuildingToMap() {
  const map = document.getElementById('cityMap');
  const building = document.createElement('div');
  building.classList.add('building');
  const randomClass = skyscraperClasses[Math.floor(Math.random() * skyscraperClasses.length)];
  building.classList.add(randomClass);
  building.style.left = Math.floor(Math.random() * (map.offsetWidth - 60)) + "px";
  building.style.top = Math.floor(Math.random() * (map.offsetHeight - 120)) + "px";
  map.appendChild(building);
}

// Add a car with a random style to the map and start its movement
function addCarToMap() {
  const map = document.getElementById('cityMap');
  const carElem = document.createElement('div');
  carElem.classList.add('car');
  const randomClass = carClasses[Math.floor(Math.random() * carClasses.length)];
  carElem.classList.add(randomClass);
  carElem.style.left = Math.floor(Math.random() * (map.offsetWidth - 30)) + "px";
  carElem.style.top = Math.floor(Math.random() * (map.offsetHeight - 30)) + "px";
  map.appendChild(carElem);
  // Set initial velocity; increase multiplier if needed for more visible movement
  let vx = Math.random() < 0.5 ? 2 : -2;
  let vy = 0; // initially horizontal movement
  cars.push({ elem: carElem, vx: vx, vy: vy });
}

// Add a worker with a random style to the map and set it to move
function addWorkerToMap() {
  const map = document.getElementById('cityMap');
  const worker = document.createElement('div');
  worker.classList.add('worker');
  const randomClass = workerClasses[Math.floor(Math.random() * workerClasses.length)];
  worker.classList.add(randomClass);
  worker.textContent = "W";  // Represent a worker with the letter "W"
  worker.style.left = Math.floor(Math.random() * (map.offsetWidth - 20)) + "px";
  worker.style.top = Math.floor(Math.random() * (map.offsetHeight - 20)) + "px";
  map.appendChild(worker);
  // Set random movement velocities for the worker (increase for better visibility)
  let vx = Math.random() < 0.5 ? 1 : -1;
  let vy = Math.random() < 0.5 ? 1 : -1;
  workersArray.push({ elem: worker, vx: vx, vy: vy });
}

// Start a job – show a job worker indicator on the map
function startJob() {
  const select = document.getElementById('jobSelect');
  const job = select.value;
  if (job && !jobActive) {
    jobActive = true;
    currentJob = job;
    jobStartTime = totalSeconds;
    document.getElementById('jobStatus').textContent = "Working as a " + job.charAt(0).toUpperCase() + job.slice(1) + "... (1 day)";
    select.disabled = true;
    document.getElementById('startJobBtn').disabled = true;
    let jobWorkerElem = document.createElement('div');
    jobWorkerElem.id = 'jobWorker';
    jobWorkerElem.classList.add('jobWorker');
    jobWorkerElem.textContent = "Job";
    document.getElementById('cityMap').appendChild(jobWorkerElem);
    saveGame();
  }
}

// Finish a job and remove the job indicator
function finishJob() {
  jobActive = false;
  let reward = 0;
  if (currentJob === "banker") reward = 500;
  if (currentJob === "bodyguard") reward = 400;
  if (currentJob === "chef") reward = 300;
  if (currentJob === "servant") reward = 200;
  money += reward;
  document.getElementById('money').textContent = money;
  document.getElementById('jobStatus').textContent =
    currentJob.charAt(0).toUpperCase() + currentJob.slice(1) + " job complete! Earned $" + reward;
  let jobWorkerElem = document.getElementById('jobWorker');
  if (jobWorkerElem) { jobWorkerElem.remove(); }
  document.getElementById('jobSelect').disabled = false;
  document.getElementById('startJobBtn').disabled = false;
  currentJob = "";
  saveGame();
}

// Upgrade workers to double their output
function upgradeWorkers() {
  if (money >= 1000 && !workersUpgraded) {
    money -= 1000;
    workersUpgraded = true;
    incomePerSec += workerCount * 1;  // additional output per worker
    document.getElementById('upgradeWorkersBtn').disabled = true;
    saveGame();
  }
}

// Upgrade cars to flying cars – update their CSS class and allow vertical movement
function upgradeCars() {
  if (money >= 2000 && !carsUpgraded) {
    money -= 2000;
    carsUpgraded = true;
    cars.forEach(car => {
      car.elem.classList.remove(...carClasses);
      car.elem.classList.add('flyingCar');
      if (car.vy === 0) {
        car.vy = Math.random() < 0.5 ? 2 : -2;
      }
    });
    document.getElementById('upgradeCarsBtn').disabled = true;
    saveGame();
  }
}

// Rebirth (prestige) resets the game but grants a permanent bonus
function rebirth() {
  if (confirm("Rebirth will restart your city for a bonus. Continue?")) {
    rebirthCount += 1;
    money = 0;
    skyscraperCount = carCount = workerCount = 0;
    skyscraperCost = 100; carCost = 200; workerCost = 50;
    workersUpgraded = false;
    carsUpgraded = false;
    incomePerSec = 1 + rebirthCount;
    document.getElementById('cityMap').innerHTML = "";
    cars = [];
    workersArray = [];
    totalSeconds = 0;
    currentDayIndex = 0;
    jobActive = false;
    currentJob = "";
    updateStatusBar();
    document.getElementById('skyscraperCost').textContent = skyscraperCost;
    document.getElementById('carCost').textContent = carCost;
    document.getElementById('workerCost').textContent = workerCost;
    document.getElementById('jobStatus').textContent = "No active job";
    document.getElementById('jobSelect').disabled = false;
    document.getElementById('startJobBtn').disabled = false;
    document.getElementById('upgradeWorkersBtn').disabled = true;
    document.getElementById('upgradeCarsBtn').disabled = true;
    saveGame();
  }
}

// Update the status bar and map day/night appearance
function updateStatusBar() {
  const dayName = daysOfWeek[currentDayIndex];
  const phase = (totalSeconds % dayLengthSeconds < (dayLengthSeconds - nightLengthSeconds)) ? "Day" : "Night";
  document.getElementById('gameDay').textContent = `${dayName}, Day ${Math.floor(totalSeconds / dayLengthSeconds) + 1}`;
  document.getElementById('dayPhase').textContent = phase;
  const map = document.getElementById('cityMap');
  map.className = phase.toLowerCase();
  document.getElementById('money').textContent = money;
}

// ---------------------
// Game Logic Loop (1 sec)
// ---------------------
function startGameLogicLoop() {
  setInterval(() => {
    money += incomePerSec;
    document.getElementById('money').textContent = money;
    totalSeconds += 1;
    if (totalSeconds % dayLengthSeconds === 0) {
      currentDayIndex = (currentDayIndex + 1) % 7;
    }
    updateStatusBar();
    if (jobActive && (totalSeconds - jobStartTime >= dayLengthSeconds)) {
      finishJob();
    }
    if (totalSeconds % 5 === 0) {
      saveGame();
    }
  }, 1000);
}

// ---------------------
// Animation Loop (50 ms)
// ---------------------
function startAnimationLoop() {
  setInterval(() => {
    updateVehicles();
    updateWorkers();
  }, 50);
}

// Update moving cars on the map
function updateVehicles() {
  const mapWidth = document.getElementById('cityMap').offsetWidth;
  const mapHeight = document.getElementById('cityMap').offsetHeight;
  cars.forEach(car => {
    let x = car.elem.offsetLeft;
    let y = car.elem.offsetTop;
    x += car.vx;
    y += car.vy;
    if (x < 0 || x > mapWidth - car.elem.offsetWidth) {
      car.vx *= -1;
      x = Math.max(0, Math.min(x, mapWidth - car.elem.offsetWidth));
    }
    if (y < 0 || y > mapHeight - car.elem.offsetHeight) {
      car.vy *= -1;
      y = Math.max(0, Math.min(y, mapHeight - car.elem.offsetHeight));
    }
    car.elem.style.left = x + "px";
    car.elem.style.top = y + "px";
  });
}

// Update moving workers on the map
function updateWorkers() {
  const mapWidth = document.getElementById('cityMap').offsetWidth;
  const mapHeight = document.getElementById('cityMap').offsetHeight;
  workersArray.forEach(worker => {
    let x = worker.elem.offsetLeft;
    let y = worker.elem.offsetTop;
    x += worker.vx;
    y += worker.vy;
    if (x < 0 || x > mapWidth - worker.elem.offsetWidth) {
      worker.vx *= -1;
      x = Math.max(0, Math.min(x, mapWidth - worker.elem.offsetWidth));
    }
    if (y < 0 || y > mapHeight - worker.elem.offsetHeight) {
      worker.vy *= -1;
      y = Math.max(0, Math.min(y, mapHeight - worker.elem.offsetHeight));
    }
    worker.elem.style.left = x + "px";
    worker.elem.style.top = y + "px";
  });
}

// Save and load game state using localStorage
function saveGame() {
  try {
    const state = {
      money,
      incomePerSec,
      skyscraperCount, carCount, workerCount,
      skyscraperCost, carCost, workerCost,
      workersUpgraded, carsUpgraded, rebirthCount,
      totalSeconds, currentDayIndex,
      jobActive, jobStartTime, currentJob
    };
    localStorage.setItem('cityGameSave', JSON.stringify(state));
  } catch (e) {
    console.warn("Auto-save failed:", e);
  }
}

function loadGame() {
  const saved = localStorage.getItem('cityGameSave');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      money = state.money ?? 0;
      incomePerSec = state.incomePerSec ?? 1;
      skyscraperCount = state.skyscraperCount ?? 0;
      carCount = state.carCount ?? 0;
      workerCount = state.workerCount ?? 0;
      skyscraperCost = state.skyscraperCost ?? 100;
      carCost = state.carCost ?? 200;
      workerCost = state.workerCost ?? 50;
      workersUpgraded = state.workersUpgraded ?? false;
      carsUpgraded = state.carsUpgraded ?? false;
      rebirthCount = state.rebirthCount ?? 0;
      totalSeconds = state.totalSeconds ?? 0;
      currentDayIndex = state.currentDayIndex ?? 0;
      jobActive = state.jobActive ?? false;
      jobStartTime = state.jobStartTime ?? 0;
      currentJob = state.currentJob ?? "";
      // Recreate dynamic elements based on saved counts
      for (let i = 0; i < skyscraperCount; i++) { addBuildingToMap(); }
      for (let i = 0; i < carCount; i++) { addCarToMap(); }
      for (let i = 0; i < workerCount; i++) { addWorkerToMap(); }
      if (workersUpgraded) {
        document.getElementById('upgradeWorkersBtn').disabled = true;
      }
      if (carsUpgraded) {
        cars.forEach(car => { if (car.vy === 0) car.vy = 2; });
        document.getElementById('upgradeCarsBtn').disabled = true;
      }
      if (jobActive) {
        jobActive = false;
        currentJob = "";
        document.getElementById('jobSelect').disabled = false;
        document.getElementById('startJobBtn').disabled = false;
        document.getElementById('jobStatus').textContent = "No active job";
      }
    } catch (e) {
      console.error("Failed to load save game:", e);
    }
  }
}

initGame();
