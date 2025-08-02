// public/main.js
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
navigator.serviceWorker.register("./sw.js");
scramjet.createFrame(iframe);

// --- BareMux Connection ---
const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");

// --- Settings & State ---
let currentProxy, currentServer, searchEngine, toolbarStyle;

// Define default Wisp URL
const defaultWispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
// Define default Bare URL (kept for BareMux, even if not selectable)
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
    // Load settings from cookies or defaults
    currentProxy = getCookie('proxy') || 'scramjet';
    currentServer = getCookie('server') || 'wisp';
    searchEngine = getCookie('searchEngine') || 'https://www.google.com/search?q=';
    toolbarStyle = getCookie('toolbarStyle') || 'island';

    // Update UI based on loaded settings
    proxySwitcher.value = currentProxy;
    serverSwitcher.value = currentServer;

    if (currentServer === 'wisp') {
        wispUrlContainer.style.display = 'block';
        bareUrlContainer.style.display = 'none';
        wispUrlInput.value = getCookie('wispUrl') || defaultWispUrl;
    } else {
        wispUrlContainer.style.display = 'none';
        bareUrlContainer.style.display = 'block';
        bareUrlInput.value = getCookie('bareUrl') || defaultBareUrl;
    }

    // Set transport based on server setting
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

    // Apply toolbar style
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
    setCookie('toolbarStyle', proxyToolbar.classList.contains('block-style') ? 'block' : 'island', 365); // Save based on current state

    await loadSettings(); // Reload settings to apply (though UI should already reflect changes)
    settingsModal.style.display = 'none';
}
var tabIds = 0;
function newTab(url) {
  var frameID = tabIds++;
  let newTab = document.createElement("iframe");
  newTab.className = "iframeWindow";
  newTab.id = "frame-" + frameID;
  newTab.style.display = "none";

  document.getElementById("center").appendChild(newTab);
  scramjet.createFrame(newTab);

  switch (document.getElementById("proxy").value) {
    case "uv":
      newTab.src = __uv$config.prefix + __uv$config.encodeUrl(url);
      break;
    case "scram":
      newTab.src = scramjet.encodeUrl(url);
      break;
  }
  changeTab(frameID);
}

function changeTab(id) {
  document.querySelectorAll(".iframeWindow").forEach((frame) => {
    frame.style.display = "none";
  });
  document.getElementById("frame-" + id).style.display = "block";
}

async function search(url) {
    if (!url.trim()) return;
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.search-container').style.display = 'none';
    iframeContainer.style.display = 'block';
    let processedUrl = url;
    if (!url.includes('.')) {
        processedUrl = searchEngine + encodeURIComponent(url);
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'https://' + url;
    }

    // Encode URL based on selected proxy
    if (currentProxy === 'scramjet') {
        iframe.src = scramjet.encodeUrl(processedUrl);
    } else if (currentProxy === 'uv' && typeof __uv$config !== 'undefined') {
        // Ensure UV config is available
        iframe.src = __uv$config.prefix + __uv$config.encodeUrl(processedUrl);
    } else {
        console.error('UV configuration not found or invalid proxy selected');
    }
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
        // Optionally allow navigating via the proxy URL bar
        // search(proxyUrlInput.value); // Uncomment if desired
        // Or prevent editing if readonly is intended
        e.preventDefault(); // Prevent default if readonly
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

// Close modal if clicked outside
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

serverSwitcher.addEventListener('change', async () => {
    currentServer = serverSwitcher.value;
    if (currentServer === 'wisp') {
        wispUrlContainer.style.display = 'block';
        bareUrlContainer.style.display = 'none';
    } else {
        wispUrlContainer.style.display = 'none';
        bareUrlContainer.style.display = 'block';
    }
    // Set transport based on server setting
    try {
        if (currentServer === 'wisp') {
            await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrlInput.value }]);
            console.log("BareMux transport set to Epoxy/Wisp");
        } else {
            await connection.setTransport("/bare/index.js", [bareUrlInput.value]);
            console.log("BareMux transport set to Bare");
        }
    } catch (e) {
        console.error("Failed to set BareMux transport on server switch:", e);
    }
});

saveSettings.addEventListener('click', saveSettingsToCookies);

backButton.addEventListener('click', () => {
    try {
        iframe.contentWindow.history.back();
    } catch (e) {
        console.warn("Could not navigate back in iframe:", e);
    }
});

forwardButton.addEventListener('click', () => {
    try {
        iframe.contentWindow.history.forward();
    } catch (e) {
       console.warn("Could not navigate forward in iframe:", e);
    }
});

refreshButton.addEventListener('click', () => {
    try {
        iframe.contentWindow.location.reload();
    } catch (e) {
        console.warn("Could not refresh iframe:", e);
        // Fallback: re-search the current URL if accessible
        // This might not work due to cross-origin restrictions
        // const currentSrc = iframe.src;
        // if (currentSrc) { search(currentSrc); }
    }
});

// Update proxy URL bar when iframe loads
iframe.addEventListener('load', () => {
    try {
        const proxiedUrl = iframe.contentWindow.location.href;
        let decodedUrl = proxiedUrl;
        try {
            if (currentProxy === 'scramjet' && proxiedUrl.includes('/scramjet/')) {
                 // More robust Scramjet URL detection and decoding if possible
                 // Scramjet might not expose a simple decode method like UV
                 // Extract the part after the prefix
                 const prefix = window.location.origin + '/scramjet/';
                 if (proxiedUrl.startsWith(prefix)) {
                     // The part after the prefix is the encoded URL
                     const encodedPart = proxiedUrl.substring(prefix.length);
                     // Decoding might be complex or not directly exposed, keep encoded for now
                     // Or try decodeURIComponent if it's just URL encoded
                     decodedUrl = decodeURIComponent(encodedPart); // Might work, might not
                 }
            } else if (currentProxy === 'uv' && proxiedUrl.includes(__uv$config.prefix)) {
                const prefix = __uv$config.prefix;
                const urlIndex = proxiedUrl.lastIndexOf(prefix);
                if (urlIndex !== -1) {
                     const encodedPart = proxiedUrl.substring(urlIndex + prefix.length);
                     decodedUrl = __uv$config.decodeUrl(encodedPart);
                }
            }
        } catch (decodeError) {
            console.error("Failed to decode URL:", decodeError);
            // If decoding fails, show the raw proxied URL or a placeholder
            decodedUrl = proxiedUrl;
        }
        proxyUrlInput.value = decodedUrl;
        proxyUrlInput.readOnly = false; // Make it editable if needed, or keep readonly
    } catch (accessError) {
        console.warn("Cannot access iframe location for URL bar:", accessError);
        // Handle cross-origin access restrictions
        proxyUrlInput.value = "Cannot display URL (cross-origin)";
        proxyUrlInput.readOnly = true;
    }
});

styleToggleButton.addEventListener('click', () => {
    proxyToolbar.classList.toggle('block-style');
    if (proxyToolbar.classList.contains('block-style')) {
        dragHandle.style.display = 'none';
        setCookie('toolbarStyle', 'block', 365);
    } else {
        dragHandle.style.display = 'block';
        setCookie('toolbarStyle', 'island', 365);
    }
});

// --- Toolbar Dragging ---
let isDragging = false;
let offsetX, offsetY;

dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - proxyToolbar.offsetLeft;
    offsetY = e.clientY - proxyToolbar.offsetTop;
    document.body.classList.add('is-dragging'); // Optional: prevent text selection while dragging
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
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