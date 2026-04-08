// Service Worker : QUANTUM-NOVA
// Autorise l'ouverture du panneau latéral au clic sur l'icône
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
