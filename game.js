import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuração Básica (Cena, Câmara, Luzes) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 

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
const directionalLight = new THREE.DirectionLigh(0xffffff, 1.0); 
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Controlo de Câmera (Rato) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.target.set(0, 0, 0); 

// --- Variáveis do Jogo ---
let playerTruck = null;
let city = null;
let packageBox = null; 
const loader = new GLTFLoader();
const clock = new THREE.Clock(); 
const keysPressed = {}; 
const moveSpeed = 40; 
const rotateSpeed = 3;  

// --- LÓGICA DO JOGO ---
let temCaixa = false;
let pontuacao = 0;
let tempoRestante = 180; 
let destinationObject = null;
const collisionDistance = 10; // MUDANÇA: Aumentado de 4 para 10 (Hitbox maior)
let gameStarted = false; // MUDANÇA: Novo estado de jogo

// Posições "Mapeadas"
// MUDANÇA: Aumentei a altura Y de 0.5 para 1.5 para flutuar acima do chão
const pickupLocation = new THREE.Vector3(10, 1.5, 10);
const dropoffLocation = new THREE.Vector3(-15, 0.5, -10); // O anel pode ficar baixo

// Elementos da UI (para atualizar)
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');

// --- Criar o Destino (Anel Brilhante) ---
function createDestinationMarker() {
    const geometry = new THREE.TorusGeometry(3, 0.3, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    destinationObject = new THREE.Mesh(geometry, material);
    destinationObject.rotation.x = Math.PI / 2; 
    destinationObject.position.copy(dropoffLocation);
    destinationObject.visible = false; 
    scene.add(destinationObject);
}
createDestinationMarker();

// --- Carregar Modelos ---
// 1. Carregar a Cidade
loader.load(
    'src/cidade.glb', 
    (gltf) => {
        city = gltf.scene;
        city.scale.set(0.1, 0.1, 0.1);
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
        // MUDANÇA: Aumentei a altura Y de 0.5 para 1.5 para não afundar
        playerTruck.position.y = 1.5; 
        playerTruck.scale.set(15, 15, 15);
        playerTruck.rotation.y = Math.PI / 2; 

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

// 3. Carregar a Caixinha
loader.load(
    'src/caixinha.glb', 
    (gltf) => {
        packageBox = gltf.scene;
        packageBox.position.copy(pickupLocation); // Põe no sítio de pickup (já com Y=1.5)
        packageBox.scale.set(5, 5, 5);
        
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

// --- Função de Colisão e Lógica do Jogo ---
function checkCollisions() {
    if (!playerTruck || !packageBox || !destinationObject) {
        return; // Ainda não carregou tudo
    }

    // Lógica 1: Pegar a caixa
    if (!temCaixa) {
        const distanceToBox = playerTruck.position.distanceTo(packageBox.position);
        if (distanceToBox < collisionDistance) {
            console.log("Pegou a caixa!");
            temCaixa = true;
            packageBox.visible = false;
            destinationObject.visible = true;

            // MUDANÇA: Inicia o temporizador do jogo!
            if (!gameStarted) {
                gameStarted = true;
            }
        }
    }
    // Lógica 2: Entregar a caixa
    else {
        const distanceToDestination = playerTruck.position.distanceTo(destinationObject.position);
        if (distanceToDestination < collisionDistance) {
            console.log("Entregou!");
            temCaixa = false;
            destinationObject.visible = false;
            
            pontuacao++;
            if(scoreDisplay) scoreDisplay.innerText = pontuacao; 

            // Faz a caixa aparecer noutro sítio
            packageBox.position.copy(pickupLocation); // Por agora, volta ao início
            packageBox.visible = true;
        }
    }
}

// --- Loop de Animação (O Cérebro em Ação) ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // MUDANÇA: O temporizador só conta se o jogo tiver começado
    if (gameStarted && tempoRestante > 0) {
        tempoRestante -= deltaTime;
        if (timerDisplay) { 
            timerDisplay.innerText = Math.floor(tempoRestante);
        }
    } else if (timerDisplay && tempoRestante <= 0) {
        timerDisplay.innerText = "FIM!";
        // Aqui podemos parar o jogo (ex: parar o movimento)
    }


    if (playerTruck) {
        // --- Lógica de Movimento WASD ---
        if (keysPressed['a']) {
            playerTruck.rotation.y += rotateSpeed * deltaTime; 
        }
        if (keysPressed['d']) {
            playerTruck.rotation.y -= rotateSpeed * deltaTime; 
        }
        if (keysPressed['w']) {
            playerTruck.translateZ(moveSpeed * deltaTime); 
        }
        if (keysPressed['s']) {
            playerTruck.translateZ(-moveSpeed * deltaTime); 
        }
        
        controls.target.copy(playerTruck.position);
    }

    checkCollisions();

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