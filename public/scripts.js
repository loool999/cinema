// public/scripts.js
const urlInput = document.getElementById('urlInput');
const searchButton = document.getElementById('searchButton');
const iframeContainer = document.getElementById('iframeContainer');
const iframe = document.getElementById('iframe');
const settingsIcon = document.getElementById('settingsIcon');
const settingsModal = document.getElementById('settingsModal');
const closeButton = document.getElementById('closeButton');
const saveSettings = document.getElementById('saveSettings');
const proxySwitcher = document.getElementById('proxySwitcher');
const serverSwitcher = document.getElementById('serverSwitcher');
const wispUrlInput = document.getElementById('wispUrl');
const bareUrlInput = document.getElementById('bareUrl');
const wispUrlContainer = document.getElementById('wispUrlContainer');
const bareUrlContainer = document.getElementById('bareUrlContainer');
const searchEngineSwitcher = document.getElementById('searchEngineSwitcher');
const backButton = document.getElementById('backButton');
const forwardButton = document.getElementById('forwardButton');
const refreshButton = document.getElementById('refreshButton');
const proxyUrlInput = document.getElementById('proxyUrlInput');
const proxySettingsButton = document.getElementById('proxySettingsButton');
const styleToggleButton = document.getElementById('styleToggleButton');
const dragHandle = document.getElementById('dragHandle');
const proxyToolbar = document.getElementById('proxyToolbar');
// --- THIS IS THE FIX ---
// Add this line to select the main container element from the HTML
const mainContainer = document.querySelector('.main-container');

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		worker: "/scram/scramjet.worker.js",
		client: "/scram/scramjet.client.js",
		shared: "/scram/scramjet.shared.js",
		sync: "/scram/scramjet.sync.js",
	},
	flags: {
		serviceworkers: true,
		syncxhr: true,
		scramitize: true,
	},
});

scramjet.init();
// Check if serviceWorker is supported
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(err => console.error("Service Worker registration failed:", err));
}
scramjet.createFrame(iframe);

// --- BareMux Connection ---
const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");

// --- Settings & State ---
let currentProxy, currentServer, searchEngine, toolbarStyle;

const defaultWispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const defaultBareUrl = (location.protocol === "https:" ? "https" : "http") + "://" + location.host + "/bare/";

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

async function loadSettings() {
    currentProxy = getCookie('proxy') || 'scramjet';
    currentServer = getCookie('server') || 'wisp';
    searchEngine = getCookie('searchEngine') || 'https://www.google.com/search?q=';
    toolbarStyle = getCookie('toolbarStyle') || 'island';

    proxySwitcher.value = currentProxy;
    serverSwitcher.value = currentServer;
    searchEngineSwitcher.value = searchEngine;

    if (currentServer === 'wisp') {
        wispUrlContainer.style.display = 'block';
        bareUrlContainer.style.display = 'none';
        wispUrlInput.value = getCookie('wispUrl') || defaultWispUrl;
    } else {
        wispUrlContainer.style.display = 'none';
        bareUrlContainer.style.display = 'block';
        bareUrlInput.value = getCookie('bareUrl') || defaultBareUrl;
    }

    try {
        if (currentServer === 'wisp') {
            await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrlInput.value }]);
            console.log("BareMux transport set to Epoxy/Wisp");
        } else {
            await connection.setTransport("/bare/index.js", [bareUrlInput.value]);
            console.log("BareMux transport set to Bare");
        }
    } catch (e) {
        console.error("Failed to set BareMux transport:", e);
    }

    if (toolbarStyle === 'block') {
        proxyToolbar.classList.add('block-style');
        dragHandle.style.display = 'none';
    } else {
        proxyToolbar.classList.remove('block-style');
        dragHandle.style.display = 'block';
    }
}

async function saveSettingsToCookies() {
    setCookie('proxy', proxySwitcher.value, 365);
    setCookie('server', serverSwitcher.value, 365);
    if (serverSwitcher.value === 'wisp') {
        setCookie('wispUrl', wispUrlInput.value, 365);
    } else {
        setCookie('bareUrl', bareUrlInput.value, 365);
    }
    setCookie('searchEngine', searchEngineSwitcher.value, 365);
    setCookie('toolbarStyle', proxyToolbar.classList.contains('block-style') ? 'block' : 'island', 365);

    await loadSettings();
    settingsModal.style.display = 'none';
}

async function search(url) {
    if (!url.trim()) return;

    // 1. Hide the main search UI elements by fading them out
    mainContainer.style.opacity = '0';
    mainContainer.style.pointerEvents = 'none';

    // 2. Trigger the particle canvas animation and wait for it to complete.
    await new Promise(resolve => {
        if (window.particleAnimation && typeof window.particleAnimation.triggerTransition === 'function') {
            window.particleAnimation.triggerTransition(resolve);
        } else {
            console.warn("Particle animation not available. Skipping transition.");
            setTimeout(resolve, 500);
        }
    });

    // --- The original search logic starts here ---
    let processedUrl = url;
    if (!url.includes('.') && !url.includes('://')) {
        processedUrl = searchEngine + encodeURIComponent(url);
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'https://' + url;
    }

    if (currentProxy === 'scramjet') {
        iframe.src = scramjet.encodeUrl(processedUrl);
    } else if (currentProxy === 'uv' && typeof __uv$config !== 'undefined') {
        iframe.src = __uv$config.prefix + __uv$config.encodeUrl(processedUrl);
    } else {
        console.error('UV configuration not found or invalid proxy selected');
        alert('Proxy configuration error. Please check settings.');
    }
    // --- End of original search logic ---

    // 4. Make the iframe container and its contents visible
    iframeContainer.classList.add('visible');
}

// --- Event Listeners ---
searchButton.addEventListener('click', () => {
    search(urlInput.value);
});

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        search(urlInput.value);
    }
});

proxyUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        search(proxyUrlInput.value); 
        e.preventDefault(); 
    }
});

settingsIcon.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

proxySettingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

serverSwitcher.addEventListener('change', async () => {
    // Logic for server switcher change
});

saveSettings.addEventListener('click', saveSettingsToCookies);

backButton.addEventListener('click', () => { try { iframe.contentWindow.history.back(); } catch (e) { console.warn("Could not navigate back:", e); }});
forwardButton.addEventListener('click', () => { try { iframe.contentWindow.history.forward(); } catch (e) { console.warn("Could not navigate forward:", e); }});
refreshButton.addEventListener('click', () => { try { iframe.contentWindow.location.reload(); } catch (e) { console.warn("Could not refresh iframe:", e); }});

iframe.addEventListener('load', () => {
    try {
        const proxiedUrl = iframe.contentWindow.location.href;
        let decodedUrl = proxiedUrl;
        
        try {
            if (currentProxy === 'scramjet') {
                 const scramjetPrefix = window.location.origin + '/scramjet/';
                 if(proxiedUrl.startsWith(scramjetPrefix)) {
                    // Simple base64 decoding might work for some Scramjet versions
                    decodedUrl = atob(proxiedUrl.split('/').pop().split('?')[0]);
                 }
            } else if (currentProxy === 'uv' && proxiedUrl.includes(__uv$config.prefix)) {
                const urlPart = proxiedUrl.split(__uv$config.prefix).pop();
                decodedUrl = __uv$config.decodeUrl(urlPart);
            }
        } catch (decodeError) {
            console.error("Failed to decode URL, showing raw:", decodeError);
            decodedUrl = proxiedUrl;
        }
        proxyUrlInput.value = decodedUrl;
        proxyUrlInput.readOnly = false;
    } catch (accessError) {
        console.warn("Cross-origin restriction: Cannot access iframe location for URL bar.", accessError);
        proxyUrlInput.value = "URL (cross-origin)";
        proxyUrlInput.readOnly = true;
    }
});

styleToggleButton.addEventListener('click', () => {
    proxyToolbar.classList.toggle('block-style');
    const isBlock = proxyToolbar.classList.contains('block-style');
    dragHandle.style.display = isBlock ? 'none' : 'block';
    setCookie('toolbarStyle', isBlock ? 'block' : 'island', 365);
});

// --- Toolbar Dragging ---
let isDragging = false;
let offsetX, offsetY;

dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - proxyToolbar.offsetLeft;
    offsetY = e.clientY - proxyToolbar.offsetTop;
    document.body.classList.add('is-dragging');
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        proxyToolbar.style.left = `${e.clientX - offsetX}px`;
        proxyToolbar.style.top = `${e.clientY - offsetY}px`;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.classList.remove('is-dragging');
});

// --- Initial Load ---
loadSettings();