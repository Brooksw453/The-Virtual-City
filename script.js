// Game state variables
let money = 0;
let incomePerSec = 1;             // $ per second (base 1)
let skyscraperCount = 0, carCount = 0, workerCount = 0;
let skyscraperCost = 100, carCost = 200, workerCost = 50;
const costMultiplier = 1.15;      // cost scaling factor for each purchase

// Upgrade state
let workersUpgraded = false;
let carsUpgraded = false;
let rebirthCount = 0;             // number of rebirths (prestige count)

// Time and jobs
const dayLengthSeconds = 20 * 60; // 20 minutes in seconds (real time) - adjust if needed
// (For quicker testing, you can shorten this value drastically, e.g. 20 or 60 seconds)
const nightLengthSeconds = 5 * 60; // 5 minutes in seconds (night duration)
let totalSeconds = 0;             // total elapsed seconds in current session (for day tracking)
let currentDayIndex = 0;          // 0=Monday, 6=Sunday
const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
let jobActive = false;
let jobStartTime = 0;
let currentJob = "";

// Audio tracks (placeholder file names - replace with actual paths or URLs)
const musicTracks = ["track1.mp3", "track2.mp3", "track3.mp3"];
const bgMusic = document.getElementById('bgMusic');

// Initialize game (load saved state if exists)
function initGame() {
  loadGame();  // load from localStorage if available
  updateStatusBar();
  // Start background music (will autoplay after user interaction in some browsers)
  if (musicTracks.length > 0) {
    bgMusic.src = musicTracks[Math.floor(Math.random() * musicTracks.length)];
    // Note: Auto-play may be blocked until user interacts; this will start once allowed
    bgMusic.play().catch(err => {
      console.log("Music autoplay prevented, will start on first interaction.");
    });
  }
  // When a track ends, play another random track
  bgMusic.addEventListener('ended', () => {
    let nextIndex = Math.floor(Math.random() * musicTracks.length);
    bgMusic.src = musicTracks[nextIndex];
    bgMusic.play();
  });
}

// Purchase an item (skyscraper, car, or worker)
function buy(type) {
  if (type === 'skyscraper' && money >= skyscraperCost) {
    money -= skyscraperCost;
    skyscraperCount++;
    // Increase income rate from skyscraper (base +10, doubled if workers upgrade? - in this case workers upgrade doesn't affect skyscraper output)
    incomePerSec += 10;
    // Scale up cost for next purchase
    skyscraperCost = Math.floor(skyscraperCost * costMultiplier);
    // Update UI
    document.getElementById('money').textContent = money;
    document.getElementById('skyscraperCost').textContent = skyscraperCost;
    // Add a skyscraper building icon to the map
    addBuildingToMap();
  }
  else if (type === 'car' && money >= carCost) {
    money -= carCost;
    carCount++;
    // Increase income rate from car (base +5)
    incomePerSec += 5;
    carCost = Math.floor(carCost * costMultiplier);
    document.getElementById('money').textContent = money;
    document.getElementById('carCost').textContent = carCost;
    // Add a car to map and start its movement
    addCarToMap();
  }
  else if (type === 'worker' && money >= workerCost) {
    money -= workerCost;
    workerCount++;
    // Increase income rate from worker (base +1; if workers upgraded, they might produce double, but we'll handle via multiplier)
    incomePerSec += 1;
    workerCost = Math.floor(workerCost * costMultiplier);
    document.getElementById('money').textContent = money;
    document.getElementById('workerCost').textContent = workerCost;
  }
  // Enable upgrades if conditions met
  if (!workersUpgraded && workerCount >= 5) {
    document.getElementById('upgradeWorkersBtn').disabled = false;
  }
  if (!carsUpgraded && carCount >= 3) {  // e.g. need at least 3 cars to upgrade
    document.getElementById('upgradeCarsBtn').disabled = false;
  }
  saveGame();
}

// Add a building icon to the city map at a random position
function addBuildingToMap() {
  const map = document.getElementById('cityMap');
  const building = document.createElement('div');
  building.className = 'building';
  // Random position within map bounds
  building.style.left = Math.floor(Math.random() * (map.offsetWidth - 30)) + "px";
  building.style.top = Math.floor(Math.random() * (map.offsetHeight - 30)) + "px";
  map.appendChild(building);
}

// Data structure for cars on map
let cars = [];  // each car will be an object { elem, vx, vy }
function addCarToMap() {
  const map = document.getElementById('cityMap');
  const carElem = document.createElement('div');
  carElem.className = 'car';
  // Place the car at a random road position (for simplicity, random position)
  carElem.style.left = Math.floor(Math.random() * (map.offsetWidth - 20)) + "px";
  carElem.style.top = Math.floor(Math.random() * (map.offsetHeight - 20)) + "px";
  map.appendChild(carElem);
  // Give the car an initial velocity: moving horizontally on a road (vy=0)
  let vx = Math.random() < 0.5 ? 1 : -1; // left or right
  let vy = 0;
  cars.push({ elem: carElem, vx: vx, vy: vy });
}

// Upgrade workers efficiency (double their output)
function upgradeWorkers() {
  if (money >= 1000 && !workersUpgraded) {
    money -= 1000;
    workersUpgraded = true;
    // Double the contribution of each worker to incomePerSec
    incomePerSec += workerCount * 1; // each worker was +1, give extra +1 each
    // Disable the button after upgrade
    document.getElementById('upgradeWorkersBtn').disabled = true;
    saveGame();
  }
}

// Upgrade cars to flying cars
function upgradeCars() {
  if (money >= 2000 && !carsUpgraded) {
    money -= 2000;
    carsUpgraded = true;
    // Change all existing cars to flying (give them vertical velocity)
    cars.forEach(car => {
      if (car.vy === 0) {
        car.vy = Math.random() < 0.5 ? 1 : -1; // give some vertical movement
      }
    });
    // Disable button
    document.getElementById('upgradeCarsBtn').disabled = true;
    saveGame();
  }
}

// Start a job from selection
function startJob() {
  const select = document.getElementById('jobSelect');
  const job = select.value;
  if (job && !jobActive) {
    jobActive = true;
    currentJob = job;
    jobStartTime = totalSeconds;
    // Update status text
    document.getElementById('jobStatus').textContent = "Working as a " + job.charAt(0).toUpperCase()+job.slice(1) + "... (1 day)";
    select.disabled = true;
    document.getElementById('startJobBtn').disabled = true;
    saveGame();
  }
}

// Complete the job (when one in-game day has passed)
function finishJob() {
  jobActive = false;
  // Determine reward based on job type
  let reward = 0;
  if (currentJob === "banker") reward = 500;
  if (currentJob === "bodyguard") reward = 400;
  if (currentJob === "chef") reward = 300;
  if (currentJob === "servant") reward = 200;
  money += reward;
  // Update money display and status text
  document.getElementById('money').textContent = money;
  document.getElementById('jobStatus').textContent = 
    currentJob.charAt(0).toUpperCase()+currentJob.slice(1) + " job complete! Earned $" + reward;
  // Re-enable job selection
  document.getElementById('jobSelect').disabled = false;
  document.getElementById('startJobBtn').disabled = false;
  currentJob = "";
  saveGame();
}

// Rebirth (Prestige reset)
function rebirth() {
  if (confirm("Rebirth will restart your city for a bonus. Continue?")) {
    // Increase rebirth count and apply bonus
    rebirthCount += 1;
    // Reset game state
    money = 0;
    skyscraperCount = carCount = workerCount = 0;
    skyscraperCost = 100; carCost = 200; workerCost = 50;
    workersUpgraded = false;
    carsUpgraded = false;
    incomePerSec = 1 + rebirthCount;  // base income increases with rebirths
    // Clear city map elements
    const map = document.getElementById('cityMap');
    map.innerHTML = "";
    cars = [];
    // Reset time and jobs
    totalSeconds = 0;
    currentDayIndex = 0;
    jobActive = false;
    currentJob = "";
    // Update UI elements
    updateStatusBar();
    document.getElementById('skyscraperCost').textContent = skyscraperCost;
    document.getElementById('carCost').textContent = carCost;
    document.getElementById('workerCost').textContent = workerCost;
    document.getElementById('jobStatus').textContent = "No active job";
    document.getElementById('jobSelect').disabled = false;
    document.getElementById('startJobBtn').disabled = false;
    document.getElementById('upgradeWorkersBtn').disabled = true;
    document.getElementById('upgradeCarsBtn').disabled = true;
    // Save and persist rebirth count
    saveGame();
  }
}

// Update the day/time and money displays
function updateStatusBar() {
  // Update day of week and day/night indicator
  const dayName = daysOfWeek[currentDayIndex];
  const phase = (totalSeconds % (dayLengthSeconds) < (dayLengthSeconds - nightLengthSeconds)) ? "Day" : "Night";
  document.getElementById('gameDay').textContent = `${dayName}, Day ${Math.floor(totalSeconds / dayLengthSeconds) + 1} `;
  document.getElementById('dayPhase').textContent = phase;
  // Apply day/night class to map background
  const map = document.getElementById('cityMap');
  map.className = phase.toLowerCase();
  // Update money display
  document.getElementById('money').textContent = money;
}

// Game loop: executed every second to update income and time
setInterval(() => {
  // Increment money by incomePerSec each second
  money += incomePerSec;
  document.getElementById('money').textContent = money;
  // Time tracking
  totalSeconds += 1;
  // Check if a new day started
  if (totalSeconds % dayLengthSeconds === 0) {
    // Advance to next day of week
    currentDayIndex = (currentDayIndex + 1) % 7;
  }
  // Update status bar displays (day/night, etc.)
  updateStatusBar();
  // Check job completion
  if (jobActive) {
    if (totalSeconds - jobStartTime >= dayLengthSeconds) {
      finishJob();
    }
  }
  // Update vehicle movements
  updateVehicles();
  // Auto-save periodically (e.g. every 5 seconds)
  if (totalSeconds % 5 === 0) {
    saveGame();
  }
}, 1000);

// Update positions of cars (called each tick)
function updateVehicles() {
  const mapWidth = document.getElementById('cityMap').offsetWidth;
  const mapHeight = document.getElementById('cityMap').offsetHeight;
  cars.forEach(car => {
    // Update position
    let x = car.elem.offsetLeft;
    let y = car.elem.offsetTop;
    x += car.vx * 2; // move 2px per tick in horizontal
    y += car.vy * 2; // move 2px per tick vertically (vy=0 for normal cars, or 1/-1 for flying)
    // Bounce the car off edges of the map
    if (x < 0 || x > mapWidth - car.elem.offsetWidth) {
      car.vx *= -1;
      x = Math.max(0, Math.min(x, mapWidth - car.elem.offsetWidth));
    }
    if (y < 0 || y > mapHeight - car.elem.offsetHeight) {
      car.vy *= -1;
      y = Math.max(0, Math.min(y, mapHeight - car.elem.offsetHeight));
    }
    // Apply new position
    car.elem.style.left = x + "px";
    car.elem.style.top = y + "px";
  });
}

// Save game state to localStorage
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

// Load game state from localStorage if available
function loadGame() {
  const saved = localStorage.getItem('cityGameSave');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      // Restore all values
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
      // Recreate some dynamic elements based on counts (optional):
      for (let i = 0; i < skyscraperCount; i++) { addBuildingToMap(); }
      for (let i = 0; i < carCount; i++) { addCarToMap(); }
      // If upgrades were purchased, re-enable their effects
      if (workersUpgraded) {
        // Workers upgrade means we had doubled their output, so ensure incomePerSec reflects that
        // (This should have been saved in incomePerSec already)
        document.getElementById('upgradeWorkersBtn').disabled = true;
      }
      if (carsUpgraded) {
        // Set all cars to flying behavior
        cars.forEach(car => { if (car.vy === 0) car.vy = 1; });
        document.getElementById('upgradeCarsBtn').disabled = true;
      }
      // If a job was active, we might not resume it properly (for simplicity, jobs do not continue after reload)
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
// ... (previous game state variables and functions remain) ...

// Modify the worker purchase to also add a worker icon to the map
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
  if (!workersUpgraded && workerCount >= 5) {
    document.getElementById('upgradeWorkersBtn').disabled = false;
  }
  if (!carsUpgraded && carCount >= 3) {
    document.getElementById('upgradeCarsBtn').disabled = false;
  }
  saveGame();
}

// Add a futuristic skyscraper to the map
function addBuildingToMap() {
  const map = document.getElementById('cityMap');
  const building = document.createElement('div');
  building.className = 'building';
  building.style.left = Math.floor(Math.random() * (map.offsetWidth - 60)) + "px";
  building.style.top = Math.floor(Math.random() * (map.offsetHeight - 120)) + "px";
  map.appendChild(building);
}

// Add a car to the map
function addCarToMap() {
  const map = document.getElementById('cityMap');
  const carElem = document.createElement('div');
  carElem.className = 'car';
  carElem.style.left = Math.floor(Math.random() * (map.offsetWidth - 30)) + "px";
  carElem.style.top = Math.floor(Math.random() * (map.offsetHeight - 30)) + "px";
  map.appendChild(carElem);
  let vx = Math.random() < 0.5 ? 1 : -1;
  let vy = 0;
  cars.push({ elem: carElem, vx: vx, vy: vy });
}

// Add a worker icon to the map
function addWorkerToMap() {
  const map = document.getElementById('cityMap');
  const worker = document.createElement('div');
  worker.className = 'worker';
  worker.style.left = Math.floor(Math.random() * (map.offsetWidth - 20)) + "px";
  worker.style.top = Math.floor(Math.random() * (map.offsetHeight - 20)) + "px";
  map.appendChild(worker);
}

// When a job starts, display a job indicator on the map
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
    jobWorkerElem.className = 'jobWorker';
    document.getElementById('cityMap').appendChild(jobWorkerElem);
    saveGame();
  }
}

// When the job is finished, remove the job indicator
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
  if (jobWorkerElem) {
    jobWorkerElem.remove();
  }
  document.getElementById('jobSelect').disabled = false;
  document.getElementById('startJobBtn').disabled = false;
  currentJob = "";
  saveGame();
}

// Upgrade cars to flying cars: update their movement and change their class to show a flying car image
function upgradeCars() {
  if (money >= 2000 && !carsUpgraded) {
    money -= 2000;
    carsUpgraded = true;
    cars.forEach(car => {
      if (car.vy === 0) {
        car.vy = Math.random() < 0.5 ? 1 : -1;
      }
      car.elem.classList.remove('car');
      car.elem.classList.add('flyingCar');
    });
    document.getElementById('upgradeCarsBtn').disabled = true;
    saveGame();
  }
}

// ... (rest of the game loop and save/load functions remain unchanged) ...


// Start the game once everything is set up
initGame();
