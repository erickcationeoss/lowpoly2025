import * as THREE from 'three';
// Precisamos de dois novos import: O GLTFLoader (que já tínhamos) e o OrbitControls (novo!)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuração Básica (Cena, Câmara, Luzes) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Fundo de céu azul

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20); // Posição da câmara (X, Y, Z) - Puxei para trás e para cima
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

// --- NOVO: Controlo de Câmera (Rato) ---
// Isto permite-lhe girar a câmera com o rato
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Adiciona um "peso" suave ao movimento
controls.target.set(0, 0, 0); // Faz a câmera começar a olhar para o centro

// --- Variáveis do Jogo ---
let playerTruck = null;
let city = null;
const loader = new GLTFLoader();

// --- NOVO: Variáveis de Movimento ---
const clock = new THREE.Clock(); // Um relógio para movimento suave
const keysPressed = {}; // Um objeto para guardar quais teclas estão pressionadas
const moveSpeed = 10; // Quão rápido o camião anda (Unidades por segundo)
const rotateSpeed = 3;  // Quão rápido o camião vira (Radianos por segundo)

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
        
        // --- NOVO: Dimensionamento ---
        // Aumenta o tamanho do camião. Mude (5, 5, 5) se quiser maior ou menor.
        playerTruck.scale.set(5, 5, 5);
        
        scene.add(playerTruck);
        console.log("Caminhão carregado!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o camião', error);
    }
);

// --- NOVO: "Ouvintes" de Teclado ---
// Estes dizem ao nosso objeto 'keysPressed' quando uma tecla está premida ou não
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
}, false);
document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
}, false);


// --- Loop de Animação (O Cérebro em Ação) ---
function animate() {
    requestAnimationFrame(animate);

    // Pega o tempo que passou desde o último frame (para movimento suave)
    const deltaTime = clock.getDelta();

    // Só corre a lógica do camião SE ele já tiver sido carregado
    if (playerTruck) {
        // --- Lógica de Movimento WASD ---
        
        // Virar (Controla a Rotação)
        if (keysPressed['a']) {
            playerTruck.rotation.y += rotateSpeed * deltaTime; // Virar à esquerda
        }
        if (keysPressed['d']) {
            playerTruck.rotation.y -= rotateSpeed * deltaTime; // Virar à direita
        }

        // Acelerar / Travar (Controla a Posição)
        if (keysPressed['w']) {
            // Move o camião para a "frente" (baseado na sua rotação)
            // Dica: Se o camião andar de lado, troque .translateZ por .translateX
            playerTruck.translateZ(moveSpeed * deltaTime);
        }
        if (keysPressed['s']) {
            // Move o camião para "trás"
            playerTruck.translateZ(-moveSpeed * deltaTime);
        }
        
        // --- Câmera a Seguir o Camião ---
        // Faz o "alvo" dos controlos do rato ser a posição do camião
        controls.target.copy(playerTruck.position);
    }

    // Atualiza os controlos da câmera (necessário para o 'enableDamping')
    controls.update();
    
    // Renderiza a cena!
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