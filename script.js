const gameLog = document.getElementById('game-log');
const playerHealthBar = document.getElementById('player-health-bar');
const playerHealthText = document.getElementById('player-health-text');
const enemyNameElem = document.getElementById('enemy-name');
const enemyHealthBar = document.getElementById('enemy-health-bar');
const enemyHealthText = document.getElementById('enemy-health-text');
const restartPanel = document.getElementById('restart-panel');
const actionButtons = document.querySelectorAll('.action-btn');

const stromyData = [
    { jmeno: "Malý škrabák", zivoty: 10, maxZivoty: 10, utok: 2 },
    { jmeno: "Plyšová věž", zivoty: 25, maxZivoty: 25, utok: 4 },
    { jmeno: "Kaktusový šílenec", zivoty: 40, maxZivoty: 40, utok: 6 },
    { jmeno: "Obří kočičí palác", zivoty: 70, maxZivoty: 70, utok: 9 }
];

let player = {
    zivoty: 35,
    maxZivoty: 35,
    utok: 5
};

let currentEnemyIndex = 0;
let currentEnemy = null;
let isAnimating = false;

function r(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addLog(message, type = 'system', isTypewriter = false) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    gameLog.appendChild(entry);
    
    if (isTypewriter) {
        let i = 0;
        let p = new Promise(resolve => {
            function typeChar() {
                if (i < message.length) {
                    entry.textContent += message.charAt(i);
                    i++;
                    gameLog.scrollTop = gameLog.scrollHeight;
                    setTimeout(typeChar, 15);
                } else {
                    resolve();
                }
            }
            typeChar();
        });
        return p;
    } else {
        entry.textContent = message;
        gameLog.scrollTop = gameLog.scrollHeight;
        return Promise.resolve();
    }
}

function updateUI() {
    // Player UI
    const playerPct = Math.max(0, (player.zivoty / player.maxZivoty) * 100);
    playerHealthBar.style.width = `${playerPct}%`;
    playerHealthText.textContent = `${Math.max(0, player.zivoty)}/${player.maxZivoty} HP`;
    
    if(playerPct < 30) {
        playerHealthBar.style.backgroundColor = 'var(--accent-red)';
    } else {
        playerHealthBar.style.backgroundColor = 'var(--health-player)';
    }

    // Enemy UI
    if (currentEnemy) {
        enemyNameElem.textContent = currentEnemy.jmeno;
        const enemyPct = Math.max(0, (currentEnemy.zivoty / currentEnemy.maxZivoty) * 100);
        enemyHealthBar.style.width = `${enemyPct}%`;
        enemyHealthText.textContent = `${Math.max(0, currentEnemy.zivoty)}/${currentEnemy.maxZivoty} HP`;
    }
}

function setButtonsState(disabled) {
    actionButtons.forEach(btn => btn.disabled = disabled);
}

function shakeElement(elemSelector) {
    const elem = document.querySelector(elemSelector);
    if(elem) {
        elem.classList.remove('shake');
        void elem.offsetWidth; // trigger reflow
        elem.classList.add('shake');
    }
}

async function startLevel() {
    if (currentEnemyIndex >= stromyData.length) {
        await addLog("GRATULUJEME! Zničil jsi všechny kočičí stromy v domě. Nyní jsi vládce obýváku!", 'critical', true);
        setButtonsState(true);
        restartPanel.classList.add('visible');
        return;
    }
    
    currentEnemy = JSON.parse(JSON.stringify(stromyData[currentEnemyIndex]));
    updateUI();
    
    await addLog(`--- Objevil se nový nepřítel: ${currentEnemy.jmeno} ---`, 'system', true);
    setButtonsState(false);
}

async function playerAction(type) {
    if (isAnimating || player.zivoty <= 0) return;
    isAnimating = true;
    setButtonsState(true);

    if (type === 1) {
        // Zápas
        let poskozeni = player.utok + r(-1, 2);
        currentEnemy.zivoty -= poskozeni;
        shakeElement('.enemy-stat');
        await addLog(`Zatáhl jsi drápky! ${currentEnemy.jmeno} utrpěl ${poskozeni} poškození.`, 'player-dmg');
    } 
    else if (type === 2) {
        // Silný kousnutí
        if (Math.random() > 0.35) {
            let poskozeni = (player.utok * 2) + r(0, 4);
            currentEnemy.zivoty -= poskozeni;
            shakeElement('.enemy-stat');
            await addLog(`HRYZ! Vyrval jsi obrovský kus plyše! Masivních ${poskozeni} poškození.`, 'critical');
        } else {
            await addLog(`Au! Kousl jsi do tvrdé plastové trubky a zlomil si malý drápek. Útok se nezdařil.`, 'enemy-dmg');
        }
    }
    else if (type === 3) {
        // Léčení
        let leceni = r(4, 10);
        player.zivoty = Math.min(player.maxZivoty, player.zivoty + leceni);
        await addLog(`Cccccss! Zníš děsivě, uklidnil ses a obnovil sis ${leceni} HP.`, 'heal');
    }

    updateUI();

    // Check Enemy Death
    if (currentEnemy.zivoty <= 0) {
        currentEnemy.zivoty = 0;
        updateUI();
        await addLog(`ÚSPĚCH! ${currentEnemy.jmeno} se s rachotem zřítil k zemi.`, 'critical', true);
        player.maxZivoty += 5;
        player.zivoty += 15;
        if(player.zivoty > player.maxZivoty) player.zivoty = player.maxZivoty;
        player.utok += 1;
        
        await addLog(`Dostal jsi odměnu: +1 Útok, Vyléčení!`, 'heal');
        updateUI();
        
        currentEnemyIndex++;
        setTimeout(() => {
            isAnimating = false;
            startLevel();
        }, 1500);
        return;
    }

    // Enemy Attack
    setTimeout(async () => {
        let dmg = currentEnemy.utok + r(-1, 2);
        if (dmg < 0) dmg = 0;
        player.zivoty -= dmg;
        shakeElement('.player-stat');
        await addLog(`${currentEnemy.jmeno} se nebezpečně zhoupl a srazil tě na zem! Ztratil jsi ${dmg} HP.`, 'enemy-dmg');
        
        updateUI();

        if (player.zivoty <= 0) {
            player.zivoty = 0;
            updateUI();
            await addLog(`Došly ti síly... ${currentEnemy.jmeno} tě definitivně porazil. Naštvaně odcházíš spát.`, 'enemy-dmg', true);
            restartPanel.classList.add('visible');
        } else {
            setButtonsState(false);
        }
        isAnimating = false;
    }, 1000);
}

async function initGame() {
    gameLog.innerHTML = '';
    restartPanel.classList.remove('visible');
    
    player.maxZivoty = 35;
    player.zivoty = 35;
    player.utok = 5;
    currentEnemyIndex = 0;
    isAnimating = true;
    updateUI();
    setButtonsState(true);

    await addLog("Vítej ve hře: SMRT KOČIČÍM STROMŮM!", 'system', true);
    await addLog("Jsi malé agresivní koťátko. Tvůj cíl: Zničit všechny kočičí stromy v domě.", 'system', true);
    
    isAnimating = false;
    startLevel();
}

// Start game on load
initGame();
