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
const moveSpeed = 40; 
const rotateSpeed = 3;  

// --- LÓGICA DO JOGO ---
let temCaixa = false;
let pontuacao = 0;
let tempoRestante = 180; 
let destinationObject = null;
const collisionDistance = 15; 
let gameStarted = false; 

// Elementos da UI (para atualizar)
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');

// --- MUDANÇA: O NOSSO MAPA! ---
// Esta é a nossa lista de locais. Use a ferramenta (Shift+Click) para adicionar mais!
// O 'y: 3' é para garantir que flutua.
// MUDANÇA: Lista atualizada com as suas 6 coordenadas mapeadas
const listaDeLocais = [
    new THREE.Vector3(437.84, 3, -768.54),
    new THREE.Vector3(-256.48, 3, -1416.59),
    new THREE.Vector3(-674.71, 3, -1505.63),
    new THREE.Vector3(-1118.90, 3, -1253.26),
    new THREE.Vector3(-1615.66, 3, -771.33),
    new THREE.Vector3(-2724.90, 3, -786.20)
];
let localAtualPickup = new THREE.Vector3();
let localAtualDropoff = new THREE.Vector3();
// --- FIM DA MUDANÇA ---

// --- Criar o Destino (Anel Brilhante) ---
function createDestinationMarker() {
    const geometry = new THREE.TorusGeometry(3, 0.3, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    destinationObject = new THREE.Mesh(geometry, material);
    destinationObject.rotation.x = Math.PI / 2; 
    destinationObject.visible = false; 
    scene.add(destinationObject);
}
createDestinationMarker();

// --- FERRAMENTA DE MAPEAMENTO (NOVO!) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    // Só ativa se o SHIFT estiver pressionado
    if (!event.shiftKey) {
        return;
    }

    // Converte a posição do rato para coordenadas do Three.js
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Dispara o raio
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        // Encontra o ponto exato onde o raio bateu
        const point = intersects[0].point;
        console.log("COORDENADA MAPEADA (use isto na 'listaDeLocais'):");
        // Arredonda os números para 2 casas decimais e ajusta o Y
        console.log(`new THREE.Vector3(${point.x.toFixed(2)}, 3, ${point.z.toFixed(2)}),`);
    }
}
window.addEventListener('click', onMouseClick);
// --- FIM DA FERRAMENTA DE MAPEAMENTO ---

// --- Carregar Modelos ---
loader.load('src/cidade.glb', (gltf) => {
    city = gltf.scene;
    city.scale.set(0.1, 0.1, 0.1);
    scene.add(city);
    console.log("Cidade carregada!");
});

loader.load('src/caminhaozinho.glb', (gltf) => {
    playerTruck = gltf.scene;
    playerTruck.position.y = 3; 
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
});

loader.load('src/caixinha.glb', (gltf) => {
    packageBox = gltf.scene;
    packageBox.scale.set(5, 5, 5);
    packageBox.traverse((child) => {
        if (child.isMesh) child.material.side = THREE.DoubleSide;
    });
    
    // MUDANÇA: Escolhe o primeiro local aleatório
    spawnNewPackage(); 
    scene.add(packageBox);
    console.log("Caixinha carregada!");
});

// --- "Ouvintes" de Teclado ---
document.addEventListener('keydown', (event) => keysPressed[event.key.toLowerCase()] = true, false);
document.addEventListener('keyup', (event) => keysPressed[event.key.toLowerCase()] = false, false);

// --- MUDANÇA: LÓGICA DE JOGO ALEATÓRIA ---
function spawnNewPackage() {
    // Escolhe um local aleatório da nossa lista
    const randomIndex = Math.floor(Math.random() * listaDeLocais.length);
    localAtualPickup.copy(listaDeLocais[randomIndex]);
    
    // Garante que o local de entrega é DIFERENTE
    let dropoffIndex;
    do {
        dropoffIndex = Math.floor(Math.random() * listaDeLocais.length);
    } while (dropoffIndex === randomIndex); // Repete se for o mesmo sítio
    
    localAtualDropoff.copy(listaDeLocais[dropoffIndex]);

    // Define as posições dos objetos
    packageBox.position.copy(localAtualPickup);
    destinationObject.position.copy(localAtualDropoff);
    
    packageBox.visible = true;
    destinationObject.visible = false;
    temCaixa = false;
}

// --- Função de Colisão e Lógica do Jogo (Atualizada) ---
function checkCollisions() {
    if (!playerTruck || !packageBox || !destinationObject) return; 

    // Lógica 1: Pegar a caixa
    if (!temCaixa) {
        const distanceToBox = playerTruck.position.distanceTo(packageBox.position);
        if (distanceToBox < collisionDistance) {
            console.log("Pegou a caixa!");
            temCaixa = true;
            packageBox.visible = false;
            destinationObject.visible = true; // Mostra o destino

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
            pontuacao++;
            if(scoreDisplay) scoreDisplay.innerText = pontuacao; 

            // MUDANÇA: Chama a função para criar uma nova entrega aleatória
            spawnNewPackage();
        }
    }
}

// --- Loop de Animação (O Cérebro em Ação) ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime(); 

    if (gameStarted && tempoRestante > 0) {
        tempoRestante -= deltaTime;
        if (timerDisplay) { 
            timerDisplay.innerText = Math.floor(tempoRestante);
        }
    } else if (timerDisplay && tempoRestante <= 0) {
        timerDisplay.innerText = "FIM!";
    }

    if (playerTruck) {
        // --- Lógica de Movimento WASD ---
        if (keysPressed['a']) playerTruck.rotation.y += rotateSpeed * deltaTime; 
        if (keysPressed['d']) playerTruck.rotation.y -= rotateSpeed * deltaTime; 
        if (keysPressed['w']) playerTruck.translateZ(-moveSpeed * deltaTime); 
        if (keysPressed['s']) playerTruck.translateZ(moveSpeed * deltaTime); 
        
        controls.target.copy(playerTruck.position);
    }

    // --- Animação "Crash Bandicoot" na Caixa ---
    if (packageBox && packageBox.visible) {
        packageBox.rotation.y += 2 * deltaTime; 
        const floatY = Math.sin(elapsedTime * 4) * 0.5;
        // MUDANÇA: Usa a altura Y da sua posição de pickup + flutuação
        packageBox.position.y = localAtualPickup.y + floatY;
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