import Driver from 'driver.js';

import * as _256js from './256js.js';

const tour = new Driver({
  onHighlighted: (e) => {
    switch (e.node.id) {
      case 'interpretTab':
        activeTab(interpretTab, interpretContainer);
        break;
      case 'replTab':
        activeTab(replTab, replContainer);
        break;
      case 'issuesTab':
        activeTab(issuesTab, issuesContainer);
        break;
      case 'aboutTab':
        activeTab(aboutTab, aboutContainer);
        break;
    }
  }
});

tour.defineSteps([
  {
    element: '#codeContainerMain',
    popover: {
      className: 'first-step-popover-class',
      title: 'Code',
      description: 'Type your code in here',
      position: 'bottom-center'
    }
  },
  {
    element: '#executeButton',
    popover: {
      title: 'Execute Button',
      description: 'Executes your code',
      position: 'bottom-left',
      offset: 14
    }
  },
  {
    element: '#clearButton',
    popover: {
      title: 'Clear Button',
      description: 'Clears the interpret output',
      position: 'bottom-center',
      offset: 8
    }
  },
  {
    element: '#clearOnRunContainer',
    popover: {
      title: 'Clear on Run',
      description: 'When enabled, automatically clears the interpret output on every execution',
      position: 'bottom-right',
      offset: -5
    }
  },
  {
    element: '#bottomContainer',
    popover: {
      title: 'Bottom Container',
      description: 'Extra panels using tabs to assist your development',
      position: 'top-center'
    }
  },
  {
    element: '#interpretTab',
    popover: {
      title: 'Interpret Tab',
      description: 'The output of your code',
      position: 'top-left',
      offset: 20
    }
  },
  {
    element: '#replTab',
    popover: {
      title: 'REPL Tab',
      description: 'A REPL enviroment to allow easy and quick running of small segments of code',
      position: 'top-left',
      offset: 5
    }
  },
  {
    element: '#issuesTab',
    popover: {
      title: 'Issues Tab',
      description: 'Shows potential issues in your code (not implemented yet!)',
      position: 'top-center',
      offset: 8
    }
  },
  {
    element: '#aboutTab',
    popover: {
      title: 'About Tab',
      description: 'Information about Eside',
      position: 'top-right',
      offset: -18
    }
  },
  {
    element: '#themeContainer',
    popover: {
      title: 'Theme',
      description: 'Customise Eside by selecting one of many themes',
      position: 'top-center',
      offset: 4
    }
  }
]);

const tourButton = document.getElementById('tourButton');

tourButton.onclick = () => { setTimeout(() => { tour.start(); }, 1); };

const linesEl = document.getElementById('codeLines');
const editor = document.getElementById('editor');
const output = document.getElementById('runOutput');

const isChrome = window.chrome !== undefined;

function resetCode() {
  editor.innerHTML = isChrome ? '\n' : '';
}

resetCode();

const version = '2.0.0-beta1';

let issues;

editor.onkeypress = () => { setTimeout(() => { onInput(editor.innerHTML); }, 0); }; // setTimeout as if you don't wait the new character hasn't been added to the innerHTML yet

function onInput(text) {
  text = text.replace(/<br>/g, '\n');

  let linesSplit = text.split('\n')
  linesSplit = linesSplit.length > 1 ? linesSplit.slice(1) : linesSplit;

  linesEl.innerText = linesSplit.map((x, i) => i + 1).join('\n');
  
  generateIssues(text);
}

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

let x, i, j, l, ll, selElmnt, a, b, c;
/* Look for any elements with the class "custom-select": */
x = document.getElementsByClassName("custom-select");
l = x.length;
for (i = 0; i < l; i++) {
  selElmnt = x[i].getElementsByTagName("select")[0];
  ll = selElmnt.length;
  /* For each element, create a new DIV that will act as the selected item: */
  a = document.createElement("DIV");
  a.setAttribute("class", "select-selected");
  a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
  x[i].appendChild(a);
  /* For each element, create a new DIV that will contain the option list: */
  b = document.createElement("DIV");
  b.setAttribute("class", "select-items select-hide");
  for (j = 0; j < ll; j++) {
    /* For each option in the original select element,
    create a new DIV that will act as an option item: */
    c = document.createElement("DIV");
    c.innerHTML = selElmnt.options[j].innerHTML;
    c.addEventListener('mouseover', function() {
      document.body.setAttribute('data-theme', this.innerHTML.toLowerCase());
    });

    c.addEventListener("click", function(e) {
        /* When an item is clicked, update the original select box,
        and the selected item: */
        document.body.setAttribute('data-theme', this.innerHTML.toLowerCase());

        let y, i, k, s, h, sl, yl;
        s = this.parentNode.parentNode.getElementsByTagName("select")[0];
        sl = s.length;
        h = this.parentNode.previousSibling;
        for (i = 0; i < sl; i++) {
          if (s.options[i].innerHTML == this.innerHTML) {
            s.selectedIndex = i;
            h.innerHTML = this.innerHTML;
            y = this.parentNode.getElementsByClassName("same-as-selected");
            yl = y.length;
            for (k = 0; k < yl; k++) {
              y[k].removeAttribute("class");
            }
            this.setAttribute("class", "same-as-selected");
            break;
          }
        }

        h.click();
    });
    if (j === 0) c.className = 'same-as-selected';
    b.appendChild(c);
  }
  x[i].appendChild(b);
  a.addEventListener("click", function(e) {
    /* When the select box is clicked, close any other select boxes,
    and open/close the current select box: */
    e.stopPropagation();
    closeAllSelect(this);
    this.nextSibling.classList.toggle("select-hide");
    this.classList.toggle("select-arrow-active");
  });
}

function closeAllSelect(elmnt) {
  /* A function that will close all select boxes in the document,
  except the current select box: */
  var x, y, i, xl, yl, arrNo = [];
  x = document.getElementsByClassName("select-items");
  y = document.getElementsByClassName("select-selected");
  xl = x.length;
  yl = y.length;
  for (i = 0; i < yl; i++) {
    if (elmnt == y[i]) {
      arrNo.push(i)
    } else {
      y[i].classList.remove("select-arrow-active");
    }
  }
  for (i = 0; i < xl; i++) {
    if (arrNo.indexOf(i)) {
      x[i].classList.add("select-hide");
    }
  }
}

/* If the user clicks anywhere outside the select box,
then close all select boxes: */
document.addEventListener("click", closeAllSelect);

// Allow stretching of bottom container
function makeResizableDiv(div) {
  for (let i = 0;i < resizers.length; i++) {
    const currentResizer = resizers[i];
    currentResizer.addEventListener('mousedown', function(e) {
      e.preventDefault()
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResize)
    })
    
    
  }
}

const bottomContainer = document.getElementById('bottomContainer');
const codeContainer = document.getElementById('codeContainer');

const beforeHeight = 10;

bottomContainer.onmousedown = (e) => {
  if (e.clientY - bottomContainer.getBoundingClientRect().top < beforeHeight) {
    console.log('lol');

    e.preventDefault();

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize);
  }
};

function resize(e) {
  let height = window.innerHeight - e.pageY;
  bottomContainer.style.height = `${height + 10}px`;
  codeContainer.style.flex = `0 0 ${window.innerHeight - height}px`;
  codeContainer.style.height = `${window.innerHeight - height}px`;

  containers.forEach((x) => {
    //x.style.flex = `0 0 ${height - 36}px`;
    //x.style.height = `${height - 36}px`;
    //x.style.flexGrow = '0';
  })
}

function stopResize() {
  window.removeEventListener('mousemove', resize);
}

//bottomContainer.