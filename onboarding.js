const QN_EXAMPLES = [
  { label: "2+2", value: "2+2" },
  { label: "sin(30)", value: "sin(30)" },
  { label: "f(x)=sin(x)", value: "f(x)=sin(x)" },
  { label: "x^2-4", value: "x^2-4" },
  { label: "a=3", value: "a=3" }
];

function qnInjectExample(value, autoRun = false) {
  const input = document.getElementById('screen');
  if (!input) {
    console.warn("Champ #screen introuvable");
    return;
  }
  input.value = value;
  input.focus();

  if (autoRun && typeof executer === 'function') {
    executer();
  }
}

function qnBindExampleButtons(root = document) {
  root.querySelectorAll('[data-example]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-example') || '';
      qnInjectExample(value, false);
    });
  });
}

function qnRenderExampleList() {
  const host = document.getElementById('exampleList');
  if (!host) return;

  host.innerHTML = '';
  QN_EXAMPLES.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'qn-pill';
    btn.type = 'button';
    btn.textContent = item.label;
    btn.setAttribute('data-example', item.value);
    host.appendChild(btn);
  });

  qnBindExampleButtons(host);
}

// V6 : le menu d'accueil est dans <template id="tpl-home">, cloné par
// AppManager.loadView('home'). On expose les helpers et on laisse
// AppManager.initAppLogic('home') déclencher l'injection au bon moment.
window.qnRenderExampleList = qnRenderExampleList;
window.qnBindExampleButtons = qnBindExampleButtons;
