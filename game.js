import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuração Básica (Cena, Câmera, Luzes) ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Fundo de céu azul

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15); // Posição da câmera (X, Y, Z) - Y é altura
camera.lookAt(0, 0, 0); // Faz a câmera olhar para o centro

const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('gameCanvas'),
    antialias: true // Deixa as bordas mais suaves
});
renderer.setSize(window.innerWidth, window.innerHeight);

// LUZES (ESSENCIAL! Sem luz, seus modelos ficam pretos)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Luz ambiente suave
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Luz do "sol"
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Variáveis para guardar nossos modelos ---
let playerTruck = null;
let city = null;

// --- Carregador de Modelos ---
const loader = new GLTFLoader();

// 1. Carregar a Cidade
loader.load(
    'cidade.glb', // <- VERIFIQUE O NOME DO SEU ARQUIVO!
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
    'caminhaozinho.glb', // <- VERIFIQUE O NOME DO SEU ARQUIVO!
    (gltf) => {
        playerTruck = gltf.scene;
        playerTruck.position.y = 0.5; // Eleva um pouco o caminhão para não ficar dentro do chão
        scene.add(playerTruck);
        console.log("Caminhão carregado!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o caminhão', error);
    }
);

// --- Loop de Animação (O que roda a cada frame) ---
function animate() {
    requestAnimationFrame(animate);

    // Futuramente, colocaremos a lógica do jogo aqui (ex: mover o caminhão)
    if (playerTruck) {
        // Exemplo bobo: faz o caminhão girar (só para testar)
        // playerTruck.rotation.y += 0.01;
    }

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