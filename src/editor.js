const linesEl = document.getElementById('codeLines');
const editor = document.getElementById('editor');
const output = document.getElementById('runOutput');

let version = '1.0.0';

let issues;

const misbehave = new Misbehave(editor, {
  autoIndent: false,
  autoOpen: true,
  autoStrip: true,
  overwrite: false,
  softTabs: 2,
  replaceTab: true,
  pairs: [['^'], ['(', ')']],
  behaviour: '',
  oninput: (text) => {
    linesEl.innerText = text.split('\n').slice(1).map((x, i) => i + 1).join('\n');
    linesEl.innerText = linesEl.innerText.length === 0 ? '1' : linesEl.innerText;

    generateIssues(text);

    /*editor.innerHTML = editor.innerHTML.replace(/(^|[;&])\s*([^256^;\s]+)/g, (_, before, actual) =>
      _.replace(actual, `<span class="command-other">${escapeHTML(actual)}</span>`));*/

    //console.log(text);

    editor.innerHTML = editor.innerHTML.replace(/\b5([^;\n])([^^;\n]+)?(\n*$|[;^])/g, (_, name, value, semi) => `<span class="command-5">5</span><span class="variable-name">${escapeHTML(name)}</span>` + (value !== undefined ? `<span class="variable-value">${escapeHTML(value)}</span>` : '') + (semi === ';' ? '<span class="semicolon">;</span>' : semi));

    editor.innerHTML = editor.innerHTML.replace(/\b2(\n*$|[;^])/g, (_, semi) => `<span class="command-2">2</span>${semi === ';' ? '<span class="semicolon">;</span>' : semi}`);

    let i = 0;
    editor.innerHTML = editor.innerHTML.replace(/\b6(\n*$|[;^])/g, (_, semi) => {
      i++;

      return `<span six-number="${i}" class="lone-command-6 command-6">6</span>${semi === ';' ? '<span class="semicolon">;</span>' : semi}`;
    });

    editor.innerHTML = editor.innerHTML.replace(/\b6([0-9]+)(\n*$|[;^])/g, (_, num, semi) => `<span class="command-6-jump-container"><span class="command-6">6</span><span class="jump-number">${num}</span>${semi === ';' ? '<span class="semicolon">;</span>' : semi}`);

    [...document.getElementsByClassName('arrowContainer')].forEach((x) => document.body.removeChild(x));

    for (let a of document.getElementsByClassName('jump-number')) {
      let b = [...document.getElementsByClassName('lone-command-6')].find((x) => x.getAttribute('six-number') === a.textContent);

      if (!b || a.offsetTop === b.offsetTop) continue;

      let thisRand = Math.floor(Math.random() * 1000);
      let num = parseInt(a.textContent);

      let arrowSvg = document.createElement('svg');
      document.body.prepend(arrowSvg);

      let fillColor = `rgb(${num % 6 * 40}, ${num % 3 * 80}, ${num % 9 * 40})`;
      arrowSvg.outerHTML = `<svg class='arrowContainer' xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" opacity="0.3">
      <defs>
        <marker id="arrowhead-${thisRand}" viewBox="0 0 10 10" refX="3" refY="5"
            markerWidth="6" markerHeight="6" fill="${fillColor}" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      <g fill="none" stroke="${fillColor}" stroke-width="2" marker-end="url(#arrowhead-${thisRand})">
        <path id="arrowLeft-${thisRand}"/>
      </g>
    </svg>`;

      drawConnector(b, a.parentElement, document.getElementById(`arrowLeft-${thisRand}`));
    }

    //editor.innerHTML = editor.innerHTML.replace(/[^>]?;[^<]?/g, (_) => _.replace(';', '<span class="semicolon">;</span>'));
  },
});

function escapeHTML(html){
  let text = document.createTextNode(html);
  let p = document.createElement('p');
  p.appendChild(text);
  return p.innerHTML;
}

function setLinesScroll() {
  linesEl.scrollTop = editor.scrollTop;
}

editor.onmousewheel = () => {
  setLinesScroll();
};

editor.onscroll = () => {
  setLinesScroll();
  setTimeout(setLinesScroll, 300);
};

var drawConnector = function(divA, divB, arrowRight) {
  let aRight = divA.offsetLeft + divA.offsetWidth;
  let bRight = divB.offsetLeft + divB.offsetWidth;

  let largestWidth = Math.max(aRight, bRight);
  //console.log(divA.offsetWidth, divB.offsetWidth, largestWidth);

  let left = largestWidth + 10;

  let posnARight = {
    x: left + 8,
    y: divA.offsetTop  + divA.offsetHeight / 2    
  };
  let posnBRight = {
    x: left,
    y: divB.offsetTop  + divB.offsetHeight / 2
  };
  //arrowLeft.setAttribute("d", dStrLeft);
  let dStrRight =
      "M" +
      (posnBRight.x      ) + "," + (posnBRight.y) + " " +
      "C" +
      (posnBRight.x + 100) + "," + (posnBRight.y) + " " +
      (posnARight.x + 100) + "," + (posnARight.y) + " " +
      (posnARight.x      ) + "," + (posnARight.y);
  arrowRight.setAttribute("d", dStrRight);
};


import * as _256js from './256js.js';

let inputBuffer = '';
let replInputBuffer = '';
let waitingForChar = false;

async function getInputChar() {
  inputBuffer = '';
  waitingForChar = true;

  while (inputBuffer.length < 1 && runningID !== undefined) { await new Promise(res => setTimeout(res, 1)); }

  waitingForChar = false;

  return inputBuffer[inputBuffer.length - 1];
}

function setCaretToEnd(el) {
  let range = document.createRange();
  let sel = window.getSelection();

  let node = el.childNodes[0];
  if (node === undefined) return;

  range.setStart(node, node.length);
  range.collapse(true);

  sel.removeAllRanges();
  sel.addRange(range);

  // Also scroll to bottom
  el.scrollTop = el.scrollHeight;
}

function outputKeyDownHandler(e) {
  if (e.target.contentEditable === 'false') return;

  let escape = e.ctrlKey || e.altKey;

  if (!escape && e.key.length === 1) {
    e.preventDefault();

    let key = e.key;
    inputBuffer += key;

    sendOutput(key, e.target);

    return false;
  }

  if (e.target.id === 'replOutput' && e.key === 'Enter' && !waitingForChar) {
    sendOutput('\n', replOutput);

    runReplCommand(inputBuffer);
    inputBuffer = '';

    e.preventDefault();
    return false;
  }

  if (e.key === 'Backspace') {
    inputBuffer = inputBuffer.slice(0, -1);
  }
}

async function runReplCommand(code) {
  let {vars, lastVar} = await _256js.interpret(code, {getInput: getInputChar, sendOutput: (d) => { sendOutput(d, replOutput) }}, 0, replVars, replLastVar);
  replVars = vars;
  replLastVar = lastVar;

  sendOutput('\n> ', replOutput);

  // TODO
  // set vars to return of interpret(txt) also passing in current repl vars and stuff
}

let replVars = {};
let replLastVar = undefined;

function outputClickHandler(e) {
  if (e.which === 1) {
    setCaretToEnd(e.target);

    e.preventDefault();
    return false;
  }
}

runOutput.onkeydown = outputKeyDownHandler;
runOutput.onclick = outputClickHandler;

function sendOutput(out, el = runOutput) {
  out = escapeHTML(out);

  el.innerHTML += out;
  setCaretToEnd(el);
}

function clearOutput() {
  runOutput.textContent = '';
}

let runningID = undefined;

const runningInfo = document.getElementById('runningInfo');
const clearOnRunCheckbox = document.getElementById('clearOnRunCheckbox');

async function runCode() {
  if (runningID !== undefined) await haltCode();

  executeButton.className = 'hide';
  haltButton.className = 'show';

  waitingForChar = false;

  runningID = Math.floor(Math.random() * 1000);

  if (clearOnRunCheckbox.checked) clearOutput();

  //runningInfo.textContent = 'Executing';

  runOutput.contentEditable = 'true';

  let startTime = performance.now();

  await _256js.interpret(editor.textContent, {getInput: getInputChar, sendOutput}, runningID);

  haltButton.className = '';
  executeButton.className = '';

  //if (runningID === undefined) return; // If was halted

  let timeTaken = performance.now() - startTime;

  runCodeEnd(`${runningID === undefined ? 'Halted' : 'Finished'} (${parseFloat((timeTaken).toFixed(3))}ms)`);
}

function runCodeEnd(textInfo) {
  runOutput.contentEditable = 'false';

  runningID = undefined;
  waitingForChar = false;

  //runningInfo.textContent = textInfo;
}

async function haltCode() {
  if (runningID === undefined) return;

  await _256js.haltInterpret(runningID);

  runCodeEnd('Halted');
}

const executeButton = document.getElementById('executeButton');
const haltButton = document.getElementById('haltButton');
const clearButton = document.getElementById('clearButton');

executeButton.onclick = () => { runCode(); };
haltButton.onclick = () => { haltCode(); };
clearButton.onclick = () => { clearOutput(); };

const interpretTab = document.getElementById('interpretTab');
const replTab = document.getElementById('replTab');
const issuesTab = document.getElementById('issuesTab');
const aboutTab = document.getElementById('aboutTab');

const tabs = [interpretTab, replTab, issuesTab, aboutTab];

const interpretContainer = document.getElementById('interpretContainer');
const replContainer = document.getElementById('replContainer');
const issuesContainer = document.getElementById('issuesContainer');
const aboutContainer = document.getElementById('aboutContainer');

const containers = [interpretContainer, replContainer, issuesContainer, aboutContainer];

function unactiveAllTabs() {
  for (let t of tabs) {
    t.className = '';
  }

  for (let c of containers) {
    c.className = '';
  }
}

function activeTab(tab, container) {
  unactiveAllTabs();

  tab.className = 'activeTab';

  container.className = 'activeContainer';
}

interpretTab.onclick = () => {
  activeTab(interpretTab, interpretContainer);
};

replTab.onclick = () => {
  activeTab(replTab, replContainer);
  inputBuffer = replInputBuffer;
};

issuesTab.onclick = () => { 
  activeTab(issuesTab, issuesContainer);
};

const esideVersionEl = document.getElementById('eside-version');
const jsVersionEl = document.getElementById('256js-version');

esideVersionEl.textContent = `v${version}`;
jsVersionEl.textContent = `v${_256js.version}`;

aboutTab.onclick = () => {
/*  aboutContainer.textContent = `256web
An online IDE and code editor for the 256 escentric programming language

256web v${version}
256.js v${_256js.version}`;*/



  activeTab(aboutTab, aboutContainer);
};

const replOutput = document.getElementById('replOutput');

replOutput.onkeydown = (e) => {
  outputKeyDownHandler(e);
  replInputBuffer = inputBuffer.slice();
};

replOutput.onclick = outputClickHandler;

const issuesList = document.getElementById('issues');

const issuesErrors = document.getElementById('issuesErrors');
const issuesWarnings = document.getElementById('issuesWarnings');
const issuesInfo = document.getElementById('issuesInfo');

const issuesTabs = [issuesErrors, issuesWarnings, issuesInfo];

function issuesType(tab) {
  tab.className = tab.className === 'activeTab' ? '' : 'activeTab';

  showIssues();
}

issuesErrors.onclick = () => {
  issuesType(issuesErrors);
};

issuesWarnings.onclick = () => {
  issuesType(issuesWarnings);
};

issuesInfo.onclick = () => {
  issuesType(issuesInfo);
};

async function generateIssues(code) {
  issues = [];

  // No semicolon at end of line
  (code.match(/^([^;^\n]*)\n/gm) || []).forEach((x) => {
    if (x === '') return;
    //console.log(x);
  });
}

function showIssues() {

}


const themeDropdown = document.getElementById('themeDropdown');

themeDropdown.onchange = () => {
  document.body.setAttribute('data-theme', themeDropdown.value.toLowerCase());
};