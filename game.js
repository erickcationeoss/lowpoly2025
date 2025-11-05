import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuração Básica (Cena, Câmara, Luzes) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 

// --- MUDANÇA AQUI: Posição da Câmara ---
// Elevada (Y=20) e Puxada para trás (Z=30) para uma melhor visão inicial
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 30); 
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
let packageBox = null; // NOVO: Variável para a caixinha
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
        // --- MUDANÇA AQUI: Escala da Cidade ---
        // Diminuímos a cidade pela metade. Ajuste 0.5 se necessário.
        city.scale.set(0.5, 0.5, 0.5);
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
        playerTruck.scale.set(20, 20, 20); // Mantemos o camião grande

        // --- MUDANÇA AQUI: Rotação do Eixo ---
        // Rodamos o camião 90 graus (PI/2) para alinhar o "frente"
        playerTruck.rotation.y = Math.PI / 2; 

        // Correção de Transparência
        playerTruck.traverse((child) => {
            if (child.isMesh) {
                child.material.side = THREE.DoubleSide; 
                child.material.transparent = false; 
                child.material.depthWrite = true; 
            }
        });
        
        scene.add(playerTruck);
        console.log("Caminhão carregado!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o camião', error);
    }
);

// --- NOVO: Carregar a Caixinha ---
loader.load(
    'src/caixinha.glb', 
    (gltf) => {
        packageBox = gltf.scene;
        
        // Posição de teste (você pode mudar X, Y, Z)
        packageBox.position.set(10, 0.5, 10);
        // Escala de teste (aumenta o tamanho)
        packageBox.scale.set(5, 5, 5);
        
        // Correção de bugs (igual ao camião)
        packageBox.traverse((child) => {
            if (child.isMesh) {
                child.material.side = THREE.DoubleSide;
            }
        });

        scene.add(packageBox);
        console.log("Caixinha carregada!");
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar a caixinha', error);
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

        // --- MUDANÇA AQUI: Movimento ---
        // Voltámos para "translateZ", que é o correto
        // agora que o camião está rodado
        if (keysPressed['w']) {
            playerTruck.translateZ(moveSpeed * deltaTime);
        }
        if (keysPressed['s']) {
            playerTruck.translateZ(-moveSpeed * deltaTime);
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