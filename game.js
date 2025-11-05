import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuração Básica (Cena, Câmara, Luzes) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20); 
camera.lookAt(0, 0, 0); 
const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('gameCanvas'),
    antialias: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); 
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Controlo de Câmera (Rato) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.target.set(0, 0, 0); 

// --- Variáveis do Jogo ---
let playerTruck = null;
let city = null;
const loader = new GLTFLoader();
const clock = new THREE.Clock(); 
const keysPressed = {}; 
const moveSpeed = 10; 
const rotateSpeed = 3;  

// --- Carregar Modelos ---
// 1. Carregar a Cidade
loader.load(
    'src/cidade.glb', 
    (gltf) => {
        city = gltf.scene;
        scene.add(city);
        console.log("Cidade carregada!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar a cidade', error);
    }
);

// 2. Carregar o Caminhãozinho
loader.load(
    'src/caminhaozinho.glb', 
    (gltf) => {
        playerTruck = gltf.scene;
        playerTruck.position.y = 0.5; 
        
        // --- MUDANÇA AQUI: Tamanho ---
        // Aumentei o valor para 20. Ajuste se for muito grande ou pequeno!
        playerTruck.scale.set(20, 20, 20);
        
        // --- MUDANÇA AQUI: Correção de Transparência ---
        // Isto percorre o seu modelo e corrige materiais "bugados"
        playerTruck.traverse((child) => {
            if (child.isMesh) {
                child.material.side = THREE.DoubleSide; // Renderiza os dois lados
                child.material.transparent = false; // Força a não ser transparente
                child.material.depthWrite = true; // Garante que é desenhado corretamente
            }
        });
        // --- Fim da Correção ---
        
        scene.add(playerTruck);
        console.log("Caminhão carregado!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o camião', error);
    }
);

// --- "Ouvintes" de Teclado ---
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
}, false);
document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
}, false);


// --- Loop de Animação (O Cérebro em Ação) ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (playerTruck) {
        // --- Lógica de Movimento WASD ---
        
        // Virar (Controla a Rotação)
        if (keysPressed['a']) {
            playerTruck.rotation.y += rotateSpeed * deltaTime; 
        }
        if (keysPressed['d']) {
            playerTruck.rotation.y -= rotateSpeed * deltaTime; 
        }

        // Acelerar / Travar (Controla a Posição)
        // --- MUDANÇA AQUI: Movimento ---
        // Trocámos "translateZ" por "translateX".
        // Se isto o fizer andar de lado, volte a trocar para "translateZ".
        if (keysPressed['w']) {
            playerTruck.translateX(moveSpeed * deltaTime);
        }
        if (keysPressed['s']) {
            playerTruck.translateX(-moveSpeed * deltaTime);
        }
        // --- Fim da Mudança ---
        
        // --- Câmera a Seguir o Camião ---
        controls.target.copy(playerTruck.position);
    }

    controls.update();
    renderer.render(scene, camera);
}

// Inicia o jogo!
animate();

// Ajusta a tela se o usuário redimensionar a janela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});