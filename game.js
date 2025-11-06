import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// MUDANÇA: Importar o DracoLoader
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

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

// --- MUDANÇA: Iluminação "Cartunesca" ---
// Luz suave que vem de cima (céu) e de baixo (chão)
const hemiLight = new THREE.HemisphereLight( 0xAAAAFF, 0x444422, 1.2 ); // Cor do céu, Cor do chão, Intensidade
scene.add( hemiLight );
// Luz do sol para dar direção
const dirLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
dirLight.position.set( 5, 10, 7 );
scene.add( dirLight );
// --- FIM DA MUDANÇA DE LUZ ---

// --- Controlo de Câmera (Rato) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.target.set(0, 0, 0); 

// --- Variáveis do Jogo ---
let playerTruck = null;
let city = null;
let packageBox = null; 
const clock = new THREE.Clock(); 
const keysPressed = {}; 
const moveSpeed = 60; // MUDANÇA: Aumentado de 40 para 60
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
// A sua lista de locais distantes
const listaDeLocais = [
    new THREE.Vector3(437.84, 3, -768.54),
    new THREE.Vector3(-256.48, 3, -1416.59),
    new THREE.Vector3(-674.71, 3, -1505.63),
    new THREE.Vector3(-1118.90, 3, -1253.26),
    new THREE.Vector3(-1615.66, 3, -771.33),
    new THREE.Vector3(-2724.90, 3, -786.20)
];
// O local da PRIMEIRA caixa (perto do jogador)
const localDaPrimeiraCaixa = new THREE.Vector3(15, 3, 10);
let localAtualPickup = new THREE.Vector3();
let localAtualDropoff = new THREE.Vector3();
// --- FIM DA MUDANÇA ---

// --- MUDANÇA: Configurar o DracoLoader ---
const dracoLoader = new DRACOLoader();
// Precisamos de dizer onde encontrar os "descodificadores" (na nuvem)
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
dracoLoader.setDecoderConfig({ type: 'js' });

const loader = new GLTFLoader();
// Diz ao GLTFLoader para usar o Draco
loader.setDRACOLoader(dracoLoader);
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
    
    // MUDANÇA: A primeira caixa "nasce" perto do jogador
    localAtualPickup.copy(localDaPrimeiraCaixa);
    packageBox.position.copy(localAtualPickup);

    scene.add(packageBox);
    console.log("Caixinha carregada!");
});

// --- "Ouvintes" de Teclado ---
document.addEventListener('keydown', (event) => keysPressed[event.key.toLowerCase()] = true, false);
document.addEventListener('keyup', (event) => keysPressed[event.key.toLowerCase()] = false, false);

// --- LÓGICA DE JOGO ALEATÓRIA ---
function spawnNewPackage() {
    // Agora, ele escolhe um local aleatório da sua lista de 6
    const randomIndex = Math.floor(Math.random() * listaDeLocais.length);
    localAtualPickup.copy(listaDeLocais[randomIndex]);
    
    // Garante que o local de entrega é DIFERENTE
    let dropoffIndex;
    do {
        dropoffIndex = Math.floor(Math.random() * listaDeLocais.length);
    } while (dropoffIndex === randomIndex); 
    
    localAtualDropoff.copy(listaDeLocais[dropoffIndex]);

    packageBox.position.copy(localAtualPickup);
    destinationObject.position.copy(localAtualDropoff);
    
    packageBox.visible = true;
    destinationObject.visible = false;
    temCaixa = false;
}

// --- Função de Colisão e Lógica do Jogo ---
function checkCollisions() {
    if (!playerTruck || !packageBox || !destinationObject) return; 

    // Lógica 1: Pegar a caixa
    if (!temCaixa) {
        // MUDANÇA: Usa 'localAtualPickup' em vez de 'packageBox.position'
        const distanceToBox = playerTruck.position.distanceTo(localAtualPickup);
        if (distanceToBox < collisionDistance) {
            console.log("Pegou a caixa!");
            temCaixa = true;
            packageBox.visible = false;
            destinationObject.visible = true; 

            // MUDANÇA: A lógica da primeira entrega foi movida para aqui
            // Se for a primeira entrega, escolhe um local da lista.
            // Se não, isto não faz mal, porque 'spawnNewPackage' vai re-definir
            if (!gameStarted) {
                gameStarted = true;
                const dropoffIndex = Math.floor(Math.random() * listaDeLocais.length);
                localAtualDropoff.copy(listaDeLocais[dropoffIndex]);
                destinationObject.position.copy(localAtualDropoff);
            }
        }
    }
    // Lógica 2: Entregar a caixa
    else {
        const distanceToDestination = playerTruck.position.distanceTo(localAtualDropoff);
        if (distanceToDestination < collisionDistance) {
            console.log("Entregou!");
            pontuacao++;
            if(scoreDisplay) scoreDisplay.innerText = pontuacao; 

            spawnNewPackage(); // Chama a função para criar uma nova entrega aleatória
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