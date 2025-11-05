import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuração Básica (Cena, Câmara, Luzes) ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Fundo de céu azul

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15); // Posição da câmara (X, Y, Z) - Y é altura
camera.lookAt(0, 0, 0); // Faz a câmara olhar para o centro

const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('gameCanvas'),
    antialias: true // Deixa as bordas mais suaves
});
renderer.setSize(window.innerWidth, window.innerHeight);

// LUZES (ESSENCIAL! Sem luz, os seus modelos ficam pretos)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Luz ambiente suave
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Luz do "sol"
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Variáveis para guardar os nossos modelos ---
let playerTruck = null;
let city = null;

// --- Carregador de Modelos ---
const loader = new GLTFLoader();

// 1. Carregar a Cidade
loader.load(
    'src/cidade.glb', // <- MUDANÇA AQUI! Adicionámos "src/"
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
    'src/caminhaozinho.glb', // <- MUDANÇA AQUI! Adicionámos "src/"
    (gltf) => {
        playerTruck = gltf.scene;
        playerTruck.position.y = 0.5; // Eleva um pouco o camião para não ficar dentro do chão
        scene.add(playerTruck);
        console.log("Caminhão carregado!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o camião', error);
    }
);

// --- Loop de Animação (O que roda a cada frame) ---
function animate() {
    requestAnimationFrame(animate);

    // Futuramente, colocaremos a lógica do jogo aqui (ex: mover o camião)
    
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