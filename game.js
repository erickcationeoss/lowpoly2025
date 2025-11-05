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
let packageBox = null; 
const loader = new GLTFLoader();
const clock = new THREE.Clock(); 
const keysPressed = {}; 
const moveSpeed = 40; // MUDANÇA: Aumentado de 20 para 40
const rotateSpeed = 3;  

// --- LÓGICA DO JOGO (RE-ADICIONADA) ---
let temCaixa = false;
let pontuacao = 0;
let tempoRestante = 180; // 3 minutos
let destinationObject = null;
const collisionDistance = 4; // Distância para "pegar" a caixa

// Posições "Mapeadas" (chutadas por agora)
const pickupLocation = new THREE.Vector3(10, 0.5, 10);
const dropoffLocation = new THREE.Vector3(-15, 0.5, -10);

// Elementos da UI (para atualizar)
// IMPORTANTE: O seu index.html precisa de ter <div id="timer-display"> e <div id="score-display">
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');

// --- LÓGICA DO JOGO (RE-ADICIONADA): Criar o Destino (Anel Brilhante) ---
function createDestinationMarker() {
    const geometry = new THREE.TorusGeometry(3, 0.3, 16, 100);
    // Material brilhante que não precisa de luz
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    destinationObject = new THREE.Mesh(geometry, material);
    destinationObject.rotation.x = Math.PI / 2; // Deita o anel
    destinationObject.position.copy(dropoffLocation);
    destinationObject.visible = false; // Começa escondido
    scene.add(destinationObject);
}
createDestinationMarker(); // Chama a função para criar o anel


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
        playerTruck.position.y = 0.5; 
        playerTruck.scale.set(15, 15, 15);
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

// 3. Carregar a Caixinha
loader.load(
    'src/caixinha.glb', 
    (gltf) => {
        packageBox = gltf.scene;
        
        packageBox.position.copy(pickupLocation); // Usa a posição "mapeada"
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

// --- LÓGICA DO JOGO (RE-ADICIONADA): Função de Colisão ---
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
            destinationObject.visible = true; // Mostra o destino
        }
    }
    // Lógica 2: Entregar a caixa
    else {
        const distanceToDestination = playerTruck.position.distanceTo(destinationObject.position);
        if (distanceToDestination < collisionDistance) {
            console.log("Entregou!");
            temCaixa = false;
            destinationObject.visible = false; // Esconde o destino
            
            // Aumenta a pontuação
            pontuacao++;
            if(scoreDisplay) scoreDisplay.innerText = pontuacao; // Atualiza a UI

            // Faz a caixa aparecer noutro sítio (pode criar uma lista de locais)
            packageBox.position.copy(pickupLocation); // Por agora, volta ao início
            packageBox.visible = true; // Mostra a caixa novamente
        }
    }
}

// --- Loop de Animação (O Cérebro em Ação) ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // --- LÓGICA DO JOGO (RE-ADICIONADA): Temporizador ---
    if (tempoRestante > 0) {
        tempoRestante -= deltaTime;
        if (timerDisplay) { // Verifica se o elemento da UI já existe
            timerDisplay.innerText = Math.floor(tempoRestante);
        }
    } else if (timerDisplay) {
        timerDisplay.innerText = "FIM!";
        // Aqui podemos parar o jogo
    }

    if (playerTruck) {
        // --- Lógica de Movimento WASD ---
        // (Usando as suas direções preferidas)
        if (keysPressed['a']) {
            playerTruck.rotation.y -= rotateSpeed * deltaTime; // Virar
        }
        if (keysPressed['d']) {
            playerTruck.rotation.y += rotateSpeed * deltaTime; // Virar
        }
        if (keysPressed['w']) {
            playerTruck.translateZ(-moveSpeed * deltaTime); // Frente
        }
        if (keysPressed['s']) {
            playerTruck.translateZ(moveSpeed * deltaTime); // Trás
        }
        
        // --- Câmera a Seguir o Camião ---
        controls.target.copy(playerTruck.position);
    }

    // --- LÓGICA DO JOGO (RE-ADICIONADA): Correr a lógica de colisão ---
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