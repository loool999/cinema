const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray;

// --- Configuration ---
const config = {
    particleCount: (canvas.width * canvas.height) / 8000,
    baseSpeed: 0.5, // The normal speed of particles
    zoomSpeed: 30,  // The speed during the transition
    currentSpeed: 0.5, // The speed for the current frame
    connectDistance: 120,
    mouseRepulsionRadius: 150,
    mouseRepulsionStrength: 2,
    rotationSensitivity: 0.005
};

// --- Camera & Mouse State ---
const camera = {
    rotationX: 0, rotationY: 0,
    cosX: 1, sinX: 0, cosY: 1, sinY: 0
};

let mouse = {
    x: null, y: null,
    lastX: 0, lastY: 0,
    isRotating: false
};

// --- Event Listeners ---
// (No changes to event listeners, they are the same as before)
window.addEventListener('mousemove', (event) => {
    if (!mouse.isRotating) { mouse.x = event.x; mouse.y = event.y; }
    if (mouse.isRotating) {
        const deltaX = event.clientX - mouse.lastX;
        const deltaY = event.clientY - mouse.lastY;
        camera.rotationY += deltaX * config.rotationSensitivity;
        camera.rotationX += deltaY * config.rotationSensitivity;
        mouse.lastX = event.clientX;
        mouse.lastY = event.clientY;
    }
});
window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
        mouse.isRotating = true;
        mouse.lastX = event.clientX;
        mouse.lastY = event.clientY;
        canvas.style.cursor = 'grabbing';
    }
});
window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
        mouse.isRotating = false;
        canvas.style.cursor = 'default';
    }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());


// --- Particle Class with 3D properties ---
// (No changes to the Particle class itself)
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = (Math.random() - 0.5) * canvas.width * 1.5;
        this.y = (Math.random() - 0.5) * canvas.height * 1.5;
        this.z = Math.random() * canvas.width;
        this.screenX = 0; this.screenY = 0;
        this.screenSize = 0; this.screenAlpha = 0;
    }
    project() {
        let rotX_Y = this.x * camera.cosY + this.z * camera.sinY;
        let rotZ_Y = this.z * camera.cosY - this.x * camera.sinY;
        let rotY_X = this.y * camera.cosX - rotZ_Y * camera.sinX;
        let finalZ = rotZ_Y * camera.cosX + this.y * camera.sinX;
        const scale = canvas.width / (canvas.width + finalZ);
        this.screenX = rotX_Y * scale + canvas.width / 2;
        this.screenY = rotY_X * scale + canvas.height / 2;
        this.screenSize = (1 - finalZ / canvas.width) * 4;
        this.screenAlpha = Math.max(0, 1 - finalZ / canvas.width);
    }
    update() {
        this.z -= config.currentSpeed; // Use the dynamic currentSpeed
        this.project();
        if (this.z < 1 || this.screenX < 0 || this.screenX > canvas.width || this.screenY < 0 || this.screenY > canvas.height) {
            this.reset();
            this.project();
        }
        if (!mouse.isRotating && mouse.x !== null) {
            const dx = this.screenX - mouse.x;
            const dy = this.screenY - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < config.mouseRepulsionRadius) {
                const force = (config.mouseRepulsionRadius - distance) / config.mouseRepulsionRadius;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * force * config.mouseRepulsionStrength;
                this.y += Math.sin(angle) * force * config.mouseRepulsionStrength;
            }
        }
    }
    draw() {
        if (this.screenSize > 0) {
            ctx.beginPath();
            ctx.arc(this.screenX, this.screenY, this.screenSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 230, 240, ${this.screenAlpha})`; 
            ctx.fill();
        }
    }
}

// --- Connect function is unchanged ---
function connect() {
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            const p1 = particlesArray[a], p2 = particlesArray[b];
            if (p1.screenSize <= 0 || p2.screenSize <= 0) continue;
            const dx = p1.screenX - p2.screenX, dy = p1.screenY - p2.screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < config.connectDistance) {
                const distanceOpacity = 1 - (distance / config.connectDistance);
                const combinedAlpha = Math.min(p1.screenAlpha, p2.screenAlpha);
                ctx.strokeStyle = `rgba(224, 230, 240, ${distanceOpacity * combinedAlpha * 0.5})`;
                ctx.lineWidth = Math.min(p1.screenSize, p2.screenSize) * 0.4;
                ctx.beginPath();
                ctx.moveTo(p1.screenX, p1.screenY);
                ctx.lineTo(p2.screenX, p2.screenY);
                ctx.stroke();
            }
        }
    }
}


// --- NEW: Global function to control the transition ---
// We attach it to the window object so scripts.js can call it.
window.particleAnimation = {
    triggerTransition: (callback) => {
        // 1. Set the speed to high for the zoom effect
        config.currentSpeed = config.zoomSpeed;
        
        // 2. Start fading out the canvas
        canvas.style.opacity = '0';
        
        // 3. After the fade is complete, execute the callback
        // The callback will be provided by scripts.js to load the iframe.
        setTimeout(() => {
            // Reset speed for when/if we return to this page
            config.currentSpeed = config.baseSpeed;
            if (callback) callback();
        }, 1000); // This duration must match the CSS transition duration
    }
};

// --- Initialization and Animation Loop ---
function init() {
    particlesArray = [];
    for (let i = 0; i < config.particleCount; i++) {
        particlesArray.push(new Particle());
    }
}

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    camera.cosX = Math.cos(camera.rotationX); camera.sinX = Math.sin(camera.rotationX);
    camera.cosY = Math.cos(camera.rotationY); camera.sinY = Math.sin(camera.rotationY);
    for (const particle of particlesArray) {
        particle.update();
        particle.draw();
    }
    connect();
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    config.particleCount = (canvas.width * canvas.height) / 8000;
    init();
});

init();
animate();