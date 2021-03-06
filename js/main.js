'use strict';

// Make sure there's always a level selected

if (!getParam('level')) {
    window.location.search = 'level=1';
}

/*----------------------------------------------------------------------------------------------------------------------
                                                   Initialisation
----------------------------------------------------------------------------------------------------------------------*/

// Constants

var VERSION = 1;
var SERVER_URL = "https://svenkonings.nl/challenge/";

// Get page elements

var navLevels = document.getElementById('levels');
var exportButton = document.getElementById('exportButton');
var importButton = document.getElementById('importButton');
var shareButton = document.getElementById('shareButton');
var scoreButton = document.getElementById('scoreButton');

var scoreboard = document.getElementById('scoreboard');
var scoreHeaderTable = document.getElementById('scoreHeaderTable');
var scoreBody = document.getElementById('scoreBody');
var scoreBodyTable = document.getElementById('scoreBodyTable');
var scoreTableBody = document.getElementById('scoreTableBody');

var simulationVisualisation = document.getElementById('simulationVisualisation');
var simulationBody = document.getElementById('simulationBody');
var runButton = document.getElementById('runButton');
var resumeButton = document.getElementById('resumeButton');
var stepButton = document.getElementById('stepButton');
var speedSelect = document.getElementById('speedSelect');
var speedRange = document.getElementById('speedRange');

var headerTable = document.getElementById('headerTable');
var tableHead = document.getElementById('tableHead');
var bodyTable = document.getElementById('bodyTable');
var tableBody = document.getElementById('tableBody');

var simulationHelp = document.getElementById('simulationHelp');
var simulationText = document.getElementById('simulationText');
var previousButton = document.getElementById('previousButton');
var nextButton = document.getElementById('nextButton');

var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');

// Inject Blockly

var workspace = Blockly.inject(blocklyDiv, {
    toolbox: document.getElementById('toolbox'),
    grid: {spacing: 25, length: 3, colour: '#ccc', snap: true},
    zoom: {controls: true, wheel: true, scaleSpeed: 1.05}
});

workspace.registerToolboxCategoryCallback("VARIABLES", function (workspace) {
    var category = workspace.getToolboxCategoryCallback("VARIABLE")(workspace);
    var block = Blockly.utils.xml.createElement('block');
    block.setAttribute('type', 'do_once');
    block.setAttribute('gap', 8);
    category.splice(1, 0, block);
    return category;
});

// Restore workspace from link hash or local storage

function restoreWorkspace() {
    if (window.location.hash.length > 1) {
        loadWorkspaceFromDatabase(window.location.hash.substring(1));
    } else {
        try {
            restoreBlocks();
        } catch (e) {
            console.error("Couldn't restore blocks:", e);
            workspace.clear();
        }
    }
    backupOnUnload();
}

restoreWorkspace();

// Save workspace to local storage on page close

function backupOnUnload() {
    window.addEventListener('unload', function () {
        var globalUrl = window.location.href.split('?')[0];
        window.localStorage.setItem(globalUrl, serializeWorkspace(false));
    }, false);
}

// Add levels to navigation

function initNavigation() {
    var html = navLevels.innerHTML;
    var lines = html.split('\n');
    for (var i = 1; i <= LEVELS.length; i++) {
        lines.splice(i + 1, 0, '<button onclick="setLevel(' + i + ');">' + i + '</button>');
    }
    navLevels.innerHTML = lines.join('\n');
}

initNavigation();

// Define onresize with all computed widths and heights

var onresize = function () {
    simulationBody.style.height = simulationVisualisation.clientHeight - headerTable.offsetHeight + 'px';
    scoreBody.style.height = scoreboard.clientHeight - scoreHeaderTable.offsetHeight + 'px';
    headerTable.style.width = bodyTable.offsetWidth + 'px';
    scoreHeaderTable.style.width = scoreBodyTable.offsetWidth + 'px';

    // Compute the absolute coordinates and dimensions of blocklyArea
    var element = blocklyArea;
    var x = 0;
    var y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element);
    // Position blocklyDiv over blocklyArea
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    Blockly.svgResize(workspace);
};
addEventListener('resize', onresize, false);
Blockly.svgResize(workspace);

/*----------------------------------------------------------------------------------------------------------------------
                                                       Utilities
----------------------------------------------------------------------------------------------------------------------*/

function getParam(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (pair[0] === variable) {
            return pair[1];
        }
    }
}

function getJson(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SERVER_URL + url, true);
    xhr.onload = function () {
        callback(JSON.parse(xhr.responseText));
    };
    xhr.send();
}

function postJson(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', SERVER_URL + url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
        callback(JSON.parse(xhr.responseText));
    };
    xhr.send(JSON.stringify(data));
}

/*----------------------------------------------------------------------------------------------------------------------
                                                    Prototype Utilities
----------------------------------------------------------------------------------------------------------------------*/


Object.prototype.equals = function (other) {
    var props = Object.getOwnPropertyNames(this);
    var otherProps = Object.getOwnPropertyNames(other);
    if (props.length !== otherProps.length) {
        return false;
    }
    for (var i = 0; i < props.length; i++) {
        var propName = props[i];
        if (this[propName] !== other[propName]) {
            return false;
        }
    }
    return true;
};
Object.defineProperty(Object.prototype, "equals", {enumerable: false});

Array.prototype.equals = function (array) {
    if (!array || this.length !== array.length) {
        return false;
    }

    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i])) {
                return false;
            }
        } else if (this[i] !== array[i] && !this[i].equals(array[i])) {
            return false;
        }
    }
    return true;
};
Object.defineProperty(Array.prototype, "equals", {enumerable: false});

Array.prototype.contains = function (value) {
    var result = false;
    for (var i = 0; i < this.length; i++) {
        if (this[i] instanceof Array) {
            if (this[i].equals(value)) {
                result = true;
                break;
            }
        } else if (this[i] === value) {
            result = true;
            break;
        }
    }
    return result;
};
Object.defineProperty(Array.prototype, "contains", {enumerable: false});

Array.prototype.sum = function () {
    return this.reduce(function (a, b) {
        return a + b;
    }, 0);
};
Object.defineProperty(Array.prototype, "sum", {enumerable: false});

Array.prototype.average = function () {
    return this.sum() / this.length;
};
Object.defineProperty(Array.prototype, "average", {enumerable: false});

/*----------------------------------------------------------------------------------------------------------------------
                                                       Scoreboard
----------------------------------------------------------------------------------------------------------------------*/

var scoreIds = [];
var response;
var scoreUpdater;

function showScoreboard() {
    scoreboard.hidden = false;
    scoreButton.innerText = 'Sluiten';
    scoreButton.className = 'red';
    scoreButton.onclick = hideScoreboard;
    exportButton.style.display = 'none';
    importButton.style.display = 'none';
    shareButton.style.display = 'none';
    updateScoreboard();
    onresize();
}

function hideScoreboard() {
    if (scoreUpdater) {
        clearInterval(scoreUpdater);
        scoreUpdater = null;
    }
    scoreboard.hidden = true;
    scoreButton.innerText = 'Scores!';
    scoreButton.className = 'blue';
    scoreButton.onclick = showScoreboard;
    exportButton.style.display = 'inline-block';
    importButton.style.display = 'inline-block';
    shareButton.style.display = 'inline-block';
}

function updateScoreboard() {
    function update() {
        if (scoreboard.hidden) return;
        getJson('api/score/read_all.php?level=' + level, function (newResponse) {
            if (!newResponse.equals(response)) {
                response = newResponse;
                scoreTableBody.innerHTML = '';
                for (var i = 0; i < response.length; i++) {
                    addScore(response[i]);
                }
            }
            highlightOwnScores();
        });
    }

    update();
    if (!scoreUpdater) {
        scoreUpdater = setInterval(update, 5000);
    }
}

function addScore(score) {
    var row = scoreTableBody.insertRow();
    var idCell = row.insertCell();
    idCell.style.display = 'none';
    idCell.innerHTML = score['id'];
    if (scoreIds.contains(score['id'])) {
        row.className = 'yellow';
    }
    row.insertCell().innerHTML = score['ts'];
    row.insertCell().innerHTML = score['score'];
    row.insertCell().innerHTML = score['efficiency'];
    row.insertCell().innerHTML = score['fairness'];
    row.onclick = function () {
        showScore(score);
        this.className = 'blue';
    };
}

function clearScoreHighlight() {
    for (var i = 0; i < scoreTableBody.rows.length; i++) {
        scoreTableBody.rows[i].className = '';
    }
    highlightOwnScores();
}

function highlightOwnScores() {
    for (var i = 0; i < scoreTableBody.rows.length; i++) {
        var row = scoreTableBody.rows[i];
        var id = row.cells[0].innerHTML;
        if (scoreIds.contains(id) && row.className !== 'blue') {
            row.className = 'yellow';
        }
    }
}

function showScore(score) {
    resetInterpreter();
    resetSystem();
    systemQueue = JSON.parse(score['queue']);
    systemData = JSON.parse(score['data']);
    var result = '';
    var clazz;
    var text;

    // Compute whole table at once for performance
    for (currentTimeslot = 0; currentTimeslot < systemData.length; currentTimeslot++) {
        result += '<tr><td>' + currentTimeslot + '</td>';
        var currentData = systemData[currentTimeslot];
        for (currentSystem = 0; currentSystem < currentData.length; currentSystem++) {
            clazz = systemData[currentTimeslot][currentSystem] !== false ? 'blue' : 'gray';
            text = systemQueue[currentTimeslot][currentSystem];
            result += '<td class="' + clazz + '">' + text + '</td>';
        }
        if (isSuccess(currentTimeslot)) {
            var control = getControl(currentTimeslot);
            clazz = 'green';
            text = control === undefined ? '&check;' : '&check; ' + control;
        } else if (isEmptySend(currentTimeslot)) {
            clazz = 'yellow';
            text = '-';
        } else {
            clazz = 'red';
            text = '&cross;';
        }
        result += '<td class="' + clazz + '">' + text + '</td></tr>';
    }
    tableBody.innerHTML = result;
}

function addScoreId(id) {
    if (!scoreIds.contains(id)) {
        scoreIds.push(id);
        var levelUrl = window.location.href.split('#')[0];
        window.localStorage.setItem(levelUrl, JSON.stringify(scoreIds))
    }
}

function loadScoreIds() {
    var levelUrl = window.location.href.split('#')[0];
    if (window.localStorage[levelUrl]) {
        scoreIds = JSON.parse(window.localStorage[levelUrl]);
    }
}

/*----------------------------------------------------------------------------------------------------------------------
                                                       Workspace
----------------------------------------------------------------------------------------------------------------------*/

function removeAttributes(workspace, xml) {
    xml.querySelectorAll('*').forEach(function (block) {
        block.removeAttribute('x');
        block.removeAttribute('y');
        block.removeAttribute('id');
    });
}

function serializeWorkspace(sanitize) {
    var xml = Blockly.Xml.workspaceToDom(workspace);
    if (sanitize) {
        removeAttributes(workspace, xml);
    }
    return Blockly.Xml.domToText(xml);
}

function saveWorkspaceToDatabase() {
    var data = {'version': VERSION, 'workspace': serializeWorkspace(true)};
    postJson('api/workspace/create.php', data, function (response) {
        var hash = response['id'];
        window.location.hash = hash;
        monitorChanges();
        alert('Deel je blokken via deze koppeling:\n\n%1'.replace('%1', window.location.href));
    });
}

function monitorChanges() {
    var startDom = serializeWorkspace(true);

    function change() {
        var newDom = serializeWorkspace(true);
        if (startDom !== newDom) {
            window.location.hash = '';
            workspace.removeChangeListener(change);
        }
    }

    workspace.addChangeListener(change);
}

function saveWorkspaceToFile() {
    var data = serializeWorkspace(true);
    var blob = new Blob([data], {type: 'application/xml'});
    saveAs(blob, 'workspace.xml')
}

function loadWorkspaceFromDatabase(hash) {
    getJson('api/workspace/read_one.php?id=' + hash, function (response) {
        loadWorkspace(response['workspace']);
        monitorChanges();
    });
}

function loadWorkspaceFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
        loadWorkspace(reader.result);
    };
    reader.readAsText(file);
}

function loadWorkspace(text) {
    var dom = Blockly.Xml.textToDom(text);
    workspace.clear();
    Blockly.Xml.domToWorkspace(dom, workspace);
}

function restoreBlocks() {
    var url = window.location.href.split('?')[0];
    if (window.localStorage[url]) {
        loadWorkspace(window.localStorage[url])
    }
}

/*----------------------------------------------------------------------------------------------------------------------
                                                         Levels
----------------------------------------------------------------------------------------------------------------------*/

var level;
var systemCount = 0;
var queueData = {};

var text = [''];
var currentText = 0;

function setLevel(newLevel) {
    if (level !== newLevel) {
        history.pushState({level: newLevel}, 'MAC Protocollen', '?level=' + newLevel);
        loadLevel();
    }
}

function loadLevel() {
    level = parseInt(getParam('level'));
    var levelData = LEVELS[level - 1];
    systemCount = levelData['system_count'];
    queueData = levelData['queue_data'];
    workspace.getFlyout().setVisible(false);
    workspace.updateToolbox(levelData['toolbox']);
    text = levelData['text'];
    currentText = 0;
    updateNavigation();
    updateTableHead();
    updateHelp();
    codeChanged();
    resetInterpreter();
    resetSystem();
    loadScoreIds();
    updateScoreboard();
}

function levelCompleted() {
    var efficiency = calculateEfficiency();
    var fairness = calculateFairness();
    var score = (efficiency * fairness) / 10;
    submitScore(VERSION, level, efficiency, fairness, score, systemQueue, systemData);
    if (level < LEVELS.length) {
        if (confirm(scoreString(efficiency, fairness, score) + '\nLevel gehaald! Wil je naar het volgende level gaan?')) {
            setLevel(level + 1);
        }
    } else {
        alert(scoreString(efficiency, fairness, score) + '\nLevel gehaald!');
    }
}

function scoreString(efficiency, fairness, score) {
    return 'Efficiëntie: ' + efficiency.toFixed(2) +
        '\nEerlijkheid: ' + fairness.toFixed(2) +
        '\nScore: ' + score.toFixed(2)
}

// TODO: Move score calculation to server-side
function submitScore(version, level, efficiency, fairness, score, queue, data) {
    var stats = {
        'version': version,
        'level': level,
        'efficiency': efficiency,
        'fairness': fairness,
        'score': score,
        'queue': queue,
        'data': data
    };
    postJson('api/score/create.php', stats, function (response) {
        if (!scoreIds.contains(response['id'])) {
            addScoreId(response['id']);
        }
    });
}

function updateNavigation() {
    var children = navLevels.children;
    navLevels.firstElementChild.disabled = level === 1;
    navLevels.lastElementChild.disabled = level === children.length - 2;
    for (var i = 1; i < children.length - 1; i++) {
        children[i].className = i === level ? 'yellow' : '';
    }
}

function updateTableHead() {
    var currentSystems = tableHead.cells.length - 2;
    if (currentSystems < systemCount) {
        for (var i = currentSystems + 1; i <= systemCount; i++) {
            tableHead.insertCell(i).innerHTML = 'Systeem ' + i;
        }
    } else {
        for (var j = currentSystems; j > systemCount; j--) {
            tableHead.deleteCell(j);
        }
    }
    onresize();
}

function updateHelp() {
    if (text === undefined) {
        simulationHelp.hidden = true;
        blocklyArea.style.width = '70%';
    } else {
        simulationHelp.hidden = false;
        blocklyArea.style.width = '50%';
        if (text.length <= 1) {
            previousButton.hidden = true;
            nextButton.hidden = true;
        } else {
            previousButton.hidden = false;
            nextButton.hidden = false;
        }
        changeText()
    }
    onresize();
}

function changeText() {
    simulationText.innerHTML = text[currentText];
    previousButton.disabled = currentText <= 0;
    nextButton.disabled = currentText >= text.length - 1;
}

function previousText() {
    if (currentText > 0) {
        currentText -= 1;
    }
    changeText();
}

function nextText() {
    if (currentText < text.length - 1) {
        currentText += 1;
    }
    changeText();
}

loadLevel();
window.onpopstate = loadLevel;

/*----------------------------------------------------------------------------------------------------------------------
                                                       Simulation
----------------------------------------------------------------------------------------------------------------------*/

var systemQueue;
var systemData;
var currentSystem;
var currentTimeslot;

var newHighlight;

function resetSystem() {
    systemQueue = [];
    systemQueue[0] = [];
    for (var i = 0; i < systemCount; i++) {
        systemQueue[0][i] = 0;
    }
    systemData = [];
    currentTimeslot = -1;
    tableBody.innerHTML = '';
}

function send(value) {
    sendData(value);
    nextSystem();
}

function sendData(value) {
    systemData[currentTimeslot][currentSystem] = value;
    tableBody.rows[currentTimeslot].cells[currentSystem + 1].className = value !== false ? 'blue' : 'gray';
    tableBody.rows[currentTimeslot].cells[currentSystem + 1].innerText = queueLength(currentTimeslot, currentSystem);
}

function nextSystem() {
    currentSystem++;
    highlightSystem(currentSystem);
    removeComments();
}

function nextTimeslot() {
    currentTimeslot++;
    updateResult();
    updateQueue();
    if (!noMoreQueue()) {
        addRow();
        systemData.push([]);
        currentSystem = 0;
        highlightSystem(currentSystem);
        return true;
    } else {
        return false;
    }
}

function addRow() {
    var atBottom = simulationBody.scrollHeight - (simulationBody.clientHeight + simulationBody.scrollTop) <= 1;
    var row = tableBody.insertRow(currentTimeslot);
    row.insertCell(0).innerHTML = currentTimeslot;
    for (var i = 1; i < systemCount + 2; i++) {
        row.insertCell(i);
    }
    if (atBottom) {
        simulationBody.scrollTop = (simulationBody.scrollHeight - simulationBody.clientHeight) + 1;
    }
}

var ignoreBlockHighlight = false;

function highlightBlock(blockId) {
    if (ignoreBlockHighlight) return;
    newHighlight = true;
    return workspace.highlightBlock(blockId);
}

function highlightSystem(systemId) {
    for (var i = 0; i < systemCount; i++) {
        tableHead.cells[i + 1].className = systemId === i ? 'blue' : '';
    }
}


function setHighlight(blockId, result) {
    if (ignoreBlockHighlight || blockId === null) return result;
    var block = workspace.getBlockById(blockId);
    if (block.isShadow()) return result;
    highlightBlock(blockId);
    return result;
}

function setComment(blockId, result) {
    if (ignoreBlockHighlight || blockId === null) return result;
    var block = workspace.getBlockById(blockId);
    if (block.isShadow()) return result;
    highlightBlock(blockId);
    block.setEditable(false);
    var text;
    if (result === undefined) {
        text = 'Geen';
    } else if (typeof result === "boolean") {
        text = result ? 'Waar' : 'Onwaar';
    } else {
        text = result.toString();
    }
    block.setCommentText(text);
    block.getCommentIcon().updateEditable();
    return result;
}

function removeComments() {
    if (ignoreBlockHighlight) return;
    var blocks = workspace.getAllBlocks();
    for (var i = 0; i < blocks.length; i++) {
        blocks[i].setCommentText(null);
    }
}

function updateResult() {
    var previousTimeslot = currentTimeslot - 1;
    if (previousTimeslot >= 0) {
        var sendCell = tableBody.rows[previousTimeslot].cells[systemCount + 1];
        if (isEmptySend(previousTimeslot)) {
            sendCell.innerHTML = '-';
            sendCell.className = 'yellow';
        } else if (isSuccess(previousTimeslot)) {
            var control = getControl(previousTimeslot);
            sendCell.innerHTML = control === undefined ? '&check;' : '&check; ' + control;
            sendCell.className = 'green';
        } else {
            sendCell.innerHTML = '&cross;';
            sendCell.className = 'red';
        }
    }
}

function updateQueue() {
    var previousTimeslot = currentTimeslot - 1;
    if (currentTimeslot > 0) {
        systemQueue.push(systemQueue[previousTimeslot].slice());
    }
    if (previousTimeslot >= 0 && isSuccess(previousTimeslot)) {
        var sender = getSender(previousTimeslot);
        if (hasQueue(currentTimeslot, sender)) {
            systemQueue[currentTimeslot][sender] -= 1;
        }
    }
    addQueueData(currentTimeslot);
}

function addQueueData(timeslot) {
    var newData = queueData[timeslot];
    var currentQueue = systemQueue[timeslot];
    if (newData) {
        for (var i = 0; i < currentQueue.length; i++) {
            currentQueue[i] += newData[i];
        }
    }
}

function noMoreQueue() {
    return currentTimeslot >= maxQueueTimeslot() && totalQueue(currentTimeslot) === 0;
}

function totalQueue(timeslot) {
    return systemQueue[timeslot].reduce(function (a, b) {
        return a + b;
    }, 0);
}

function maxQueueTimeslot() {
    return Math.max.apply(null, Object.keys(queueData));
}

function queueLength(timeslot, systemId) {
    return systemQueue[timeslot][systemId];
}

function hasQueue(timeslot, systemId) {
    return queueLength(timeslot, systemId) > 0;
}

function sendCount(timeslot) {
    if (timeslot < 0) {
        return 0;
    }
    var sendCount = 0;
    var timeslotData = systemData[timeslot];
    for (var i = 0; i < timeslotData.length; i++) {
        if (timeslotData[i] !== false) {
            sendCount++
        }
    }
    return sendCount;
}

function isEmptySend(timeslot) {
    return sendCount(timeslot) === 0;
}

function isSuccess(timeslot) {
    return sendCount(timeslot) === 1;
}

function isCollision(timeslot) {
    return sendCount(timeslot) > 1;
}

function getSender(timeslot) {
    if (isSuccess(timeslot)) {
        var timeslotData = systemData[timeslot];
        for (var i = 0; i < timeslotData.length; i++) {
            if (timeslotData[i] !== false) {
                return i;
            }
        }
    }
}

function getControl(timeslot) {
    if (isSuccess(timeslot)) {
        var timeslotData = systemData[timeslot];
        for (var i = 0; i < timeslotData.length; i++) {
            if (timeslotData[i] !== false && timeslotData[i] !== true) {
                return timeslotData[i];
            }
        }
    }
}

function hasSend(timeslot, systemId) {
    if (timeslot < 0) {
        return false
    }
    return systemData[timeslot][systemId] !== false
}

/*----------------------------------------------------------------------------------------------------------------------
                                                        Score
----------------------------------------------------------------------------------------------------------------------*/

function calculateEfficiency() {
    var dataSlots = 0;
    var sendSlots = 0;
    for (var timeslot = 0; timeslot < currentTimeslot; timeslot++) {
        if (totalQueue(timeslot) > 0) {
            dataSlots += 1;
            if (isSuccess(timeslot) && hasQueue(timeslot, getSender(timeslot))) {
                sendSlots += 1;
            }
        }
    }
    var efficiency = (sendSlots / dataSlots) * 100;
    return +efficiency.toFixed(2);
}

function systemsWithQueue(timeslots, start, end) {
    var systems = [];
    loop: for (var system = 0; system < systemCount; system++) {
        for (var i = start; i < end; i++) {
            var timeslot = timeslots[i];
            if (hasQueue(timeslot, system)) {
                systems.push(system);
                continue loop;
            }
        }
    }
    return systems;
}

function systemThroughputs(systems, data, start, end) {
    var throughputs = [];
    for (var i = 0; i < systems.length; i++) {
        var throughput = 0;
        var system = systems[i];
        for (var j = start; j < end; j++) {
            if (data[j][system] !== false) {
                throughput++;
            }
        }
        throughputs.push(throughput);
    }
    return throughputs;
}

// Average Raj Jain's fairness index of a sliding window size 12
function calculateFairness() {
    var sendSlots = [];
    var sendData = [];
    for (var timeslot = 0; timeslot < currentTimeslot; timeslot++) {
        if (isSuccess(timeslot) && hasQueue(timeslot, getSender(timeslot))) {
            sendSlots.push(timeslot);
            sendData.push(systemData[timeslot])
        }
    }
    var windowFairness = [];
    for (var windowStart = 0, windowEnd = 12; windowEnd < sendSlots.length; windowStart++, windowEnd++) {
        var systems = systemsWithQueue(sendSlots, windowStart, windowEnd);
        var throughputs = systemThroughputs(systems, sendData, windowStart, windowEnd);
        var x = Math.pow(throughputs.sum(), 2);
        var x2 = systems.length * throughputs.reduce(function (a, b) {
            return a + Math.pow(b, 2);
        }, 0);
        windowFairness.push((x / x2) * 100);
    }
    var fairness = windowFairness.average();
    return +fairness.toFixed(2);
}

/*----------------------------------------------------------------------------------------------------------------------
                                                      Execution
----------------------------------------------------------------------------------------------------------------------*/
var blocklyCode = null;
var code = null;
var myInterpreter = null;
var runner = null;

function codeChanged() {
    var newCode = Blockly.JavaScript.workspaceToCode(workspace)
        .replace(/  /g, '') // Avoid indentation differences
        .replace(/\/\/.*?\n/gm, ''); // Avoid comment differences
    if (blocklyCode === newCode) {
        // Code hasn't changed
        return;
    }
    blocklyCode = newCode;

    var variableCode = '';
    var systemCode;
    var splitCode = blocklyCode.split('\n\n\n');
    if (splitCode.length === 1) {
        systemCode = splitCode[0];
    } else if (splitCode.length === 2) {
        var variableNames = splitCode[0].slice(4, -1).split(', ');
        systemCode = splitCode[1];

        for (var i = 0; i < variableNames.length; i++) {
            var variableName = variableNames[i];
            variableCode += 'var ' + variableName + ' = [];\n';
            var variableRegex = new RegExp('\\b' + variableName + '\\b', 'g');
            var newVariableName = variableName + '[currentSystem()]';
            systemCode = systemCode.replace(variableRegex, newVariableName);
        }
    } else {
        console.error("Couldn't parse Blockly code:\n" + blocklyCode);
        systemCode = blocklyCode;
    }
    code = variableCode +
        "var infiniteLoopCount = 0;\n" +
        "while (nextTimeslot()) {\n" +
        "    for (var i = 0; i < systemCount(); i++) {\n" +
        "        var result = simulateSystem();\n" +
        "        if (result === undefined) {\n" +
        "            result = false;\n" +
        "        }\n" +
        "        send(result);\n" +
        "    }\n" +
        "    if (isSuccess(currentTimeslot())) {\n" +
        "        infiniteLoopCount = 0;\n" +
        "    } else if (++infiniteLoopCount > 100){\n" +
        "        nextTimeslot();\n" +
        "        alert('100 timeslots niet succesvol verstuurd, simulatie gestopt.');\n" +
        "        break;\n" +
        "    }\n" +
        "}\n" +
        "if (infiniteLoopCount <= 100) {\n" +
        "    levelCompleted();\n" +
        "}\n" +
        "function simulateSystem() {\n" +
        systemCode +
        "}";
    resetInterpreter();
}

codeChanged();
workspace.addChangeListener(function (event) {
    if (!(event instanceof Blockly.Events.Ui)) {
        codeChanged();
    }
});

function run() {
    if (myInterpreter) {
        var hasMore = true;
        switch (speedSelect.value) {
            case 'timeslot':
                var oldTimeslot = currentTimeslot;
                ignoreBlockHighlight = true;
                while (hasMore && oldTimeslot === currentTimeslot) {
                    hasMore = myInterpreter.step();
                }
                ignoreBlockHighlight = false;
                break;
            case 'system':
                var oldSystem = currentSystem;
                ignoreBlockHighlight = true;
                while (hasMore && oldSystem === currentSystem) {
                    hasMore = myInterpreter.step();
                }
                ignoreBlockHighlight = false;
                break;
            case 'block':
                hasMore = step();
                break;
        }
        if (hasMore) {
            runner = setTimeout(run, speedRange.value);
        } else if (myInterpreter) {
            resetInterpreter();
        }
    }
}

function initInterpreter() {
    resetInterpreter();
    resetSystem();
    // noinspection JSUnresolvedFunction
    myInterpreter = new Interpreter(code, initApi);
    resumeButton.disabled = false;
}

function runInterpreter() {
    initInterpreter();
    startRunner();
}

function resetInterpreter() {
    stopRunner();
    resumeButton.disabled = true;
    myInterpreter = null;
    removeComments();
    highlightBlock(null);
    highlightSystem(null);
    clearScoreHighlight();
}

// TODO: Simuleer/Stop/Hervat, Reset, Stap knoppen
function startRunner() {
    if (runner === null) {
        runButton.innerText = 'Stop!';
        runButton.className = 'red';
        runButton.onclick = stopRunner;
        resumeButton.disabled = true;
        stepButton.disabled = true;
        runner = setTimeout(run, 0);
    }
}

function stopRunner() {
    if (runner) {
        clearTimeout(runner);
        runner = null;
        runButton.innerText = 'Simuleer!';
        runButton.className = 'green';
        runButton.onclick = runInterpreter;
        resumeButton.disabled = false;
        stepButton.disabled = false;
    }
}

function step() {
    if (!myInterpreter) {
        initInterpreter();
    }
    var hasMore = true;
    newHighlight = false;
    while (hasMore && !newHighlight) {
        hasMore = myInterpreter.step();
    }
    if (!hasMore) {
        resetInterpreter();
    }
    return hasMore;
}
