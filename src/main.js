import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a1810, 30, 120); // Smoky, war-torn fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x2a1810); // Dusk war-torn sky
document.body.appendChild(renderer.domElement);

// Lighting setup (war-torn dusk theme)
const ambientLight = new THREE.AmbientLight(0x4a2c1a, 0.4); // Warm, dim ambient
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xff6b47, 0.6); // Fiery orange sun
directionalLight.position.set(-20, 15, 10); // Low angle like dusk
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// Fire light (flickering effect)
const fireLight = new THREE.PointLight(0xff4500, 1.5, 30);
fireLight.position.set(10, 3, 5);
fireLight.isPointLight = true; // Mark for identification
scene.add(fireLight);

// Game state
const gameState = {
  keys: {},
  player: null,
  shadow: null,
  platforms: [],
  velocity: { x: 0, y: 0 },
  onGround: false,
  facingRight: true,
  isAttacking: false,
  attackTimer: 0,
  textures: {
    normal: null,
    attack: null,
    shadow: null
  },
  audio: {
    swordSfx: null,
    whisperSfx: null,
    ghostGoneSfx: null
  },
  shadows: [],
  shadowSpawnTimer: 0,
  killCount: 0
};

// Audio setup
function setupAudio() {
  // Try to load external cave audio first, then fallback to generated audio
  const caveAudio = new Audio();
  caveAudio.loop = true;
  caveAudio.volume = 0.3; // Audible volume for background ambience
  
  // Try external audio sources first
  const audioSources = [
    './caves-of-dawn-open-source.mp3',
    './cave-ambience.mp3',
    './caves.mp3',
    './ambient-cave.mp3'
  ];
  
  let audioLoaded = false;
  
  function tryAudioSource(index) {
    if (index < audioSources.length && !audioLoaded) {
      caveAudio.src = audioSources[index];
      
      caveAudio.addEventListener('canplaythrough', () => {
        audioLoaded = true;
        console.log(`Loaded cave audio: ${audioSources[index]}`);
        startAudio();
      }, { once: true });
      
      caveAudio.addEventListener('error', () => {
        console.log(`Failed to load: ${audioSources[index]}`);
        tryAudioSource(index + 1);
      }, { once: true });
      
      caveAudio.load();
    } else if (!audioLoaded) {
      // Fallback to generated cave ambience
      console.log('Using generated cave ambience');
      createGeneratedCaveAmbience();
    }
  }
  
  function startAudio() {
    console.log('Cave audio ready, setting up playback...');
    
    // Start audio on first user interaction to comply with browser policies
    const startAudioOnInteraction = () => {
      console.log('Starting cave audio playback...');
      caveAudio.play().then(() => {
        console.log('Cave audio playing successfully!');
      }).catch(e => console.log('Audio play failed:', e));
      document.removeEventListener('click', startAudioOnInteraction);
      document.removeEventListener('keydown', startAudioOnInteraction);
    };
    
    document.addEventListener('click', startAudioOnInteraction);
    document.addEventListener('keydown', startAudioOnInteraction);
    
    // Try to autoplay (may be blocked)
    caveAudio.play().then(() => {
      console.log('Cave audio auto-started successfully!');
    }).catch(e => {
      console.log('Audio autoplay prevented - click anywhere or press any key to start audio');
    });
  }
  
  function createGeneratedCaveAmbience() {
    // Create synthetic cave ambience using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Low frequency rumble
    const rumbleOsc = audioContext.createOscillator();
    const rumbleGain = audioContext.createGain();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.setValueAtTime(40, audioContext.currentTime);
    rumbleGain.gain.setValueAtTime(0.1, audioContext.currentTime);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(audioContext.destination);
    
    // Water drips (white noise filtered)
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    function playDrip() {
      if (Math.random() < 0.1) { // 10% chance each second
        const noiseSource = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const dripGain = audioContext.createGain();
        
        noiseSource.buffer = noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);
        dripGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        dripGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        noiseSource.connect(filter);
        filter.connect(dripGain);
        dripGain.connect(audioContext.destination);
        
        noiseSource.start();
        noiseSource.stop(audioContext.currentTime + 0.1);
      }
    }
    
    // Start the ambience on user interaction
    const startGeneratedAudio = () => {
      rumbleOsc.start();
      setInterval(playDrip, 1000);
      document.removeEventListener('click', startGeneratedAudio);
      document.removeEventListener('keydown', startGeneratedAudio);
    };
    
    document.addEventListener('click', startGeneratedAudio);
    document.addEventListener('keydown', startGeneratedAudio);
  }
  
  // Start trying to load audio
  tryAudioSource(0);
  
  return caveAudio;
}

// Load sword sound effect
function loadSwordSfx() {
  const swordAudio = new Audio();
  swordAudio.volume = 0.4; // Moderate volume for sound effect
  swordAudio.preload = 'auto';
  
  swordAudio.addEventListener('canplaythrough', () => {
    console.log('Sword SFX loaded successfully');
    gameState.audio.swordSfx = swordAudio;
  }, { once: true });
  
  swordAudio.addEventListener('error', (e) => {
    console.log('Failed to load sword-sfx.mp3:', e);
    // Could add fallback synthetic sword sound here if needed
  }, { once: true });
  
  swordAudio.src = './sword-sfx.mp3';
  swordAudio.load();
}

// Load whisper sound effect
function loadWhisperSfx() {
  const whisperAudio = new Audio();
  whisperAudio.volume = 0.5; // Moderate volume for atmospheric effect
  whisperAudio.preload = 'auto';
  
  whisperAudio.addEventListener('canplaythrough', () => {
    console.log('Whisper SFX loaded successfully');
    gameState.audio.whisperSfx = whisperAudio;
  }, { once: true });
  
  whisperAudio.addEventListener('error', (e) => {
    console.log('Failed to load whisper.mp3:', e);
  }, { once: true });
  
  whisperAudio.src = './whisper.mp3';
  whisperAudio.load();
}

// Load ghost gone sound effect
function loadGhostGoneSfx() {
  const ghostGoneAudio = new Audio();
  ghostGoneAudio.volume = 0.6; // Audible volume for satisfying feedback
  ghostGoneAudio.preload = 'auto';
  
  ghostGoneAudio.addEventListener('canplaythrough', () => {
    console.log('Ghost Gone SFX loaded successfully');
    gameState.audio.ghostGoneSfx = ghostGoneAudio;
  }, { once: true });
  
  ghostGoneAudio.addEventListener('error', (e) => {
    console.log('Failed to load ghost-gone.mp3:', e);
  }, { once: true });
  
  ghostGoneAudio.src = './ghost-gone.mp3';
  ghostGoneAudio.load();
}

// Load character textures
const textureLoader = new THREE.TextureLoader();

// Player (warrior sprite using ss.png and 22.png for attack)
function createPlayer() {
  return new Promise((resolve) => {
    // Load both textures
    const loadTextures = [
      new Promise(resolve => textureLoader.load('./ss.png', resolve)),
      new Promise(resolve => textureLoader.load('./22.png', resolve))
    ];
    
    Promise.all(loadTextures).then(([normalTexture, attackTexture]) => {
      // Store textures in game state
      gameState.textures.normal = normalTexture;
      gameState.textures.attack = attackTexture;
      
      // Load shadow texture
      textureLoader.load('./shadow-2.png', (shadowTexture) => {
        gameState.textures.shadow = shadowTexture;
        console.log('Shadow texture loaded');
      });
      
      // Create sprite material with normal texture
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: normalTexture,
        transparent: true,
        alphaTest: 0.1
      });
      
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2, 3, 1); // Make character larger
      sprite.position.set(0, 3, 0);
      
      scene.add(sprite);
      resolve(sprite);
    });
  });
}

// Attack function
function performAttack() {
  if (gameState.isAttacking) return; // Prevent multiple attacks
  
  gameState.isAttacking = true;
  gameState.attackTimer = 300; // 0.3 seconds - quick, snappy attack
  
  // Play sword sound effect
  if (gameState.audio.swordSfx) {
    gameState.audio.swordSfx.currentTime = 0; // Reset to beginning
    gameState.audio.swordSfx.play().catch(e => console.log('Sword SFX play failed:', e));
  }
  
  // Switch to attack texture
  gameState.player.material.map = gameState.textures.attack;
  gameState.player.material.needsUpdate = true;
  
  // Maintain sprite direction
  if (!gameState.facingRight) {
    gameState.player.material.map.wrapS = THREE.RepeatWrapping;
    gameState.player.material.map.repeat.x = -1;
    gameState.player.material.map.offset.x = 1;
  }
}

// Update attack state
function updateAttack(deltaTime) {
  if (gameState.isAttacking) {
    gameState.attackTimer -= deltaTime;
    
    if (gameState.attackTimer <= 0) {
      // Attack finished, switch back to normal texture
      gameState.isAttacking = false;
      gameState.player.material.map = gameState.textures.normal;
      gameState.player.material.needsUpdate = true;
      
      // Maintain sprite direction
      if (!gameState.facingRight) {
        gameState.player.material.map.wrapS = THREE.RepeatWrapping;
        gameState.player.material.map.repeat.x = -1;
        gameState.player.material.map.offset.x = 1;
      } else {
        gameState.player.material.map.repeat.x = 1;
        gameState.player.material.map.offset.x = 0;
      }
    }
  }
}

// Create 2D-style platforms (Mario blocks style)
function createPlatform(x, y, width = 4, height = 1) {
  const geometry = new THREE.BoxGeometry(width, height, 1);
  
  // Create a brick-like texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Base color (war-torn stone)
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(0, 0, 64, 64);
  
  // Add brick pattern
  ctx.strokeStyle = '#2a1f18';
  ctx.lineWidth = 2;
  
  // Horizontal lines
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(64, 16);
  ctx.moveTo(0, 32);
  ctx.lineTo(64, 32);
  ctx.moveTo(0, 48);
  ctx.lineTo(64, 48);
  ctx.stroke();
  
  // Vertical lines (offset pattern)
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(32, 16);
  ctx.moveTo(16, 16);
  ctx.lineTo(16, 32);
  ctx.moveTo(48, 16);
  ctx.lineTo(48, 32);
  ctx.moveTo(32, 32);
  ctx.lineTo(32, 48);
  ctx.moveTo(16, 48);
  ctx.lineTo(16, 64);
  ctx.moveTo(48, 48);
  ctx.lineTo(48, 64);
  ctx.stroke();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / 2, height);
  
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const platform = new THREE.Mesh(geometry, material);
  platform.position.set(x, y, 0);
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);
  return { mesh: platform, x, y, width, height };
}

// Store tree positions for fire/smoke effects
const treeFirePositions = [];

// Create background elements
function createBackground() {
  // War-torn forest with burnt trees
  for (let layer = 0; layer < 3; layer++) {
    const depth = -10 - (layer * 10);
    const treeCount = 12 - (layer * 2);
    
    for (let i = 0; i < treeCount; i++) {
      const treeX = (Math.random() - 0.5) * 100;
      
      if (Math.random() < 0.7) {
        // Burnt/dead trees
        const treeHeight = Math.random() * 3 + 2;
        const treeGeometry = new THREE.ConeGeometry(0.3 + layer * 0.1, treeHeight, 6);
        const burnLevel = Math.random();
        const treeMaterial = new THREE.MeshLambertMaterial({ 
          color: burnLevel > 0.5 ? 0x1a1a1a : 0x2d1b0e // Black or dark brown
        });
        const tree = new THREE.Mesh(treeGeometry, treeMaterial);
        
        tree.position.set(
          treeX,
          treeHeight / 2 - 2,
          depth
        );
        tree.receiveShadow = true;
        scene.add(tree);
        
        // Add chance for this tree to have fire/smoke
        if (Math.random() < 0.4) { // 40% chance for burning trees
          treeFirePositions.push({
            x: treeX,
            y: treeHeight / 2 - 2 + treeHeight * 0.7, // Near top of tree
            z: depth,
            height: treeHeight,
            layer: layer
          });
        }
      } else {
        // Bare tree trunks (war damage)
        const trunkHeight = Math.random() * 2 + 1;
        const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.2, trunkHeight, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x2d1b0e });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        trunk.position.set(
          treeX,
          trunkHeight / 2 - 2,
          depth
        );
        trunk.receiveShadow = true;
        scene.add(trunk);
        
        // Smoldering stumps have a chance for smoke
        if (Math.random() < 0.3) { // 30% chance for smoking stumps
          treeFirePositions.push({
            x: treeX,
            y: trunkHeight / 2 - 2 + trunkHeight, // Top of stump
            z: depth,
            height: trunkHeight,
            layer: layer,
            smokeOnly: true
          });
        }
      }
    }
  }
  
  // Burnt ground
  const groundGeometry = new THREE.PlaneGeometry(200, 50);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2a1f18 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3;
  ground.position.z = -5;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Add fire particles (lightweight)
  createFireEffects();
  
  // Add smoke particles
  createSmokeEffects();
  
  // Add tree fires and smoke
  createTreeFireEffects();
}

// Create fire effects
function createFireEffects() {
  const fireParticles = [];
  
  // Create fire positions
  const firePositions = [
    { x: 15, y: 0, z: -5 },
    { x: -20, y: 0, z: -8 },
    { x: 8, y: 2, z: -3 },
    { x: -5, y: 0, z: -10 }
  ];
  
  firePositions.forEach((pos, index) => {
    for (let i = 0; i < 8; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5 + Math.random() * 0.3),
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        pos.x + (Math.random() - 0.5) * 2,
        pos.y + Math.random() * 1.5,
        pos.z + (Math.random() - 0.5)
      );
      
      scene.add(particle);
      fireParticles.push({
        mesh: particle,
        baseY: pos.y,
        speed: 0.02 + Math.random() * 0.02,
        life: Math.random() * 2
      });
    }
  });
  
  // Animate fire particles
  function animateFireParticles() {
    fireParticles.forEach(particle => {
      particle.mesh.position.y += particle.speed;
      particle.life += 0.01;
      
      // Reset particle when it gets too high
      if (particle.mesh.position.y > particle.baseY + 3) {
        particle.mesh.position.y = particle.baseY;
        particle.mesh.position.x += (Math.random() - 0.5) * 0.5;
      }
      
      // Color cycling for fire effect
      const hue = (particle.life * 50) % 60 / 360; // Red to yellow
      particle.mesh.material.color.setHSL(hue, 1, 0.6);
      particle.mesh.material.opacity = 0.5 + Math.sin(particle.life * 5) * 0.2;
    });
    
    requestAnimationFrame(animateFireParticles);
  }
  animateFireParticles();
}

// Create smoke effects
function createSmokeEffects() {
  const smokeParticles = [];
  
  for (let i = 0; i < 15; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.3, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4a4a4a,
      transparent: true,
      opacity: 0.2
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.set(
      (Math.random() - 0.5) * 50,
      Math.random() * 8,
      -15 - Math.random() * 10
    );
    
    scene.add(particle);
    smokeParticles.push({
      mesh: particle,
      speed: 0.01 + Math.random() * 0.01,
      drift: (Math.random() - 0.5) * 0.005
    });
  }
  
  // Animate smoke particles
  function animateSmokeParticles() {
    smokeParticles.forEach(particle => {
      particle.mesh.position.y += particle.speed;
      particle.mesh.position.x += particle.drift;
      
      // Reset particle when it gets too high
      if (particle.mesh.position.y > 15) {
        particle.mesh.position.y = -2;
        particle.mesh.position.x = (Math.random() - 0.5) * 50;
      }
    });
    
    requestAnimationFrame(animateSmokeParticles);
  }
  animateSmokeParticles();
}

// Create fire and smoke effects on trees
function createTreeFireEffects() {
  const treeFireParticles = [];
  const treeSmokeParticles = [];
  
  treeFirePositions.forEach((treePos, treeIndex) => {
    const particleCount = treePos.smokeOnly ? 0 : Math.max(2, 6 - treePos.layer * 2); // Fewer particles for distant trees
    const smokeCount = Math.max(3, 8 - treePos.layer * 2);
    
    // Create fire particles for burning trees
    if (!treePos.smokeOnly) {
      for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.08 - treePos.layer * 0.02, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
          color: new THREE.Color().setHSL(Math.random() * 0.08, 1, 0.5 + Math.random() * 0.3),
          transparent: true,
          opacity: 0.8 - treePos.layer * 0.2
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
          treePos.x + (Math.random() - 0.5) * 0.8,
          treePos.y + Math.random() * 0.5,
          treePos.z + (Math.random() - 0.5) * 0.3
        );
        
        scene.add(particle);
        treeFireParticles.push({
          mesh: particle,
          baseX: treePos.x,
          baseY: treePos.y,
          baseZ: treePos.z,
          speed: 0.015 + Math.random() * 0.01,
          life: Math.random() * 3,
          layer: treePos.layer
        });
      }
    }
    
    // Create smoke particles for all trees
    for (let i = 0; i < smokeCount; i++) {
      const smokeSize = 0.2 + treePos.layer * 0.1; // Larger smoke for distant trees
      const particleGeometry = new THREE.SphereGeometry(smokeSize, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0, 0, 0.15 + Math.random() * 0.1), // Dark gray variations
        transparent: true,
        opacity: 0.3 - treePos.layer * 0.08
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        treePos.x + (Math.random() - 0.5) * 1.2,
        treePos.y + Math.random() * 0.8,
        treePos.z + (Math.random() - 0.5) * 0.5
      );
      
      scene.add(particle);
      treeSmokeParticles.push({
        mesh: particle,
        baseX: treePos.x,
        baseY: treePos.y,
        baseZ: treePos.z,
        speed: 0.008 + Math.random() * 0.005,
        drift: (Math.random() - 0.5) * 0.003,
        life: Math.random() * 5,
        layer: treePos.layer
      });
    }
  });
  
  // Animate tree fire particles
  function animateTreeFireParticles() {
    treeFireParticles.forEach(particle => {
      particle.mesh.position.y += particle.speed;
      particle.mesh.position.x += (Math.random() - 0.5) * 0.003; // Slight flicker
      particle.life += 0.02;
      
      // Reset particle when it gets too high
      if (particle.mesh.position.y > particle.baseY + 2) {
        particle.mesh.position.y = particle.baseY;
        particle.mesh.position.x = particle.baseX + (Math.random() - 0.5) * 0.8;
        particle.mesh.position.z = particle.baseZ + (Math.random() - 0.5) * 0.3;
      }
      
      // Color cycling for fire effect (red to orange to yellow)
      const hue = (particle.life * 40) % 50 / 360;
      particle.mesh.material.color.setHSL(hue, 1, 0.6 + Math.sin(particle.life * 8) * 0.2);
      particle.mesh.material.opacity = (0.6 - particle.layer * 0.15) + Math.sin(particle.life * 6) * 0.2;
    });
    
    requestAnimationFrame(animateTreeFireParticles);
  }
  
  // Animate tree smoke particles
  function animateTreeSmokeParticles() {
    treeSmokeParticles.forEach(particle => {
      particle.mesh.position.y += particle.speed;
      particle.mesh.position.x += particle.drift;
      particle.mesh.position.x += Math.sin(particle.life * 2) * 0.002; // Gentle swaying
      particle.life += 0.01;
      
      // Reset particle when it gets too high
      if (particle.mesh.position.y > particle.baseY + 4 + particle.layer) {
        particle.mesh.position.y = particle.baseY;
        particle.mesh.position.x = particle.baseX + (Math.random() - 0.5) * 1.2;
        particle.mesh.position.z = particle.baseZ + (Math.random() - 0.5) * 0.5;
        particle.life = 0;
      }
      
      // Fade smoke as it rises
      const heightFactor = (particle.mesh.position.y - particle.baseY) / (4 + particle.layer);
      particle.mesh.material.opacity = Math.max(0.05, (0.25 - particle.layer * 0.05) * (1 - heightFactor));
    });
    
    requestAnimationFrame(animateTreeSmokeParticles);
  }
  
  // Start animations
  if (treeFireParticles.length > 0) {
    animateTreeFireParticles();
  }
  if (treeSmokeParticles.length > 0) {
    animateTreeSmokeParticles();
  }
}

// Shadow creature management
function createShadowCreature(platformIndex) {
  if (!gameState.textures.shadow) return null;
  
  const platform = gameState.platforms[platformIndex];
  if (!platform) return null;
  
  // Create shadow sprite
  const shadowMaterial = new THREE.SpriteMaterial({ 
    map: gameState.textures.shadow,
    transparent: true,
    alphaTest: 0.1
  });
  
  const shadowSprite = new THREE.Sprite(shadowMaterial);
  shadowSprite.scale.set(1.5, 2, 1); // Slightly smaller than player
  
  // Position on platform
  const spawnX = platform.x + (Math.random() - 0.5) * (platform.width - 1);
  shadowSprite.position.set(spawnX, platform.y + 1.5, 0);
  
  scene.add(shadowSprite);
  
  const shadowCreature = {
    sprite: shadowSprite,
    platformIndex: platformIndex,
    life: 0,
    floatOffset: Math.random() * Math.PI * 2,
    opacity: 0
  };
  
  // Play whisper sound
  if (gameState.audio.whisperSfx) {
    gameState.audio.whisperSfx.currentTime = 0;
    gameState.audio.whisperSfx.play().catch(e => console.log('Whisper SFX play failed:', e));
  }
  
  return shadowCreature;
}

function spawnRandomShadow() {
  // Check if we can spawn more shadows
  if (gameState.shadows.length >= 3) return;
  
  // Random chance to spawn (adjust for frequency)
  if (Math.random() < 0.002) { // 0.2% chance per frame
    const platformIndex = Math.floor(Math.random() * gameState.platforms.length);
    const newShadow = createShadowCreature(platformIndex);
    
    if (newShadow) {
      gameState.shadows.push(newShadow);
      console.log(`Shadow spawned on platform ${platformIndex}. Total shadows: ${gameState.shadows.length}`);
    }
  }
}

function updateShadowCreatures(deltaTime) {
  gameState.shadows.forEach((shadow, index) => {
    shadow.life += deltaTime;
    
    // Floating animation
    const baseY = gameState.platforms[shadow.platformIndex].y + 1.5;
    shadow.sprite.position.y = baseY + Math.sin(shadow.life * 0.003 + shadow.floatOffset) * 0.3;
    
    // Fade in effect
    if (shadow.life < 1000) {
      shadow.opacity = shadow.life / 1000;
    } else if (shadow.life > 8000) {
      // Start fading out after 8 seconds
      shadow.opacity = Math.max(0, 1 - (shadow.life - 8000) / 2000);
    } else {
      shadow.opacity = 1;
    }
    
    // Apply opacity with subtle pulsing
    const pulse = 0.8 + Math.sin(shadow.life * 0.005) * 0.2;
    shadow.sprite.material.opacity = shadow.opacity * pulse;
    
    // Remove shadow after 10 seconds
    if (shadow.life > 10000) {
      scene.remove(shadow.sprite);
      gameState.shadows.splice(index, 1);
      console.log(`Shadow despawned. Total shadows: ${gameState.shadows.length}`);
    }
  });
  
  // Try to spawn new shadows
  spawnRandomShadow();
}

// Check collision between player attack and shadow creatures
function checkShadowAttackCollision() {
  if (!gameState.isAttacking || !gameState.player) return;
  
  const player = gameState.player;
  const playerBounds = {
    x: player.position.x,
    y: player.position.y,
    width: 2, // Player sprite width
    height: 3  // Player sprite height
  };
  
  // Check collision with each shadow creature
  gameState.shadows.forEach((shadow, index) => {
    const shadowBounds = {
      x: shadow.sprite.position.x,
      y: shadow.sprite.position.y,
      width: 1.5, // Shadow sprite width
      height: 2   // Shadow sprite height
    };
    
    // Simple AABB collision detection
    if (Math.abs(playerBounds.x - shadowBounds.x) < (playerBounds.width / 2 + shadowBounds.width / 2) &&
        Math.abs(playerBounds.y - shadowBounds.y) < (playerBounds.height / 2 + shadowBounds.height / 2)) {
      
      // Shadow creature hit! Remove it and play sound
      scene.remove(shadow.sprite);
      gameState.shadows.splice(index, 1);
      
      // Play ghost gone sound effect
      if (gameState.audio.ghostGoneSfx) {
        gameState.audio.ghostGoneSfx.currentTime = 0;
        gameState.audio.ghostGoneSfx.play().catch(e => console.log('Ghost Gone SFX play failed:', e));
      }
      
      console.log(`Shadow creature banished! Total shadows: ${gameState.shadows.length}`);
    }
  });
}

// Create shadow
function createShadow() {
  const shadowGeometry = new THREE.PlaneGeometry(1.5, 0.5);
  const shadowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.3 
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.6, 0); // Start at ground level
  scene.add(shadow);
  return shadow;
}

// Update shadow position
function updateShadow() {
  if (!gameState.player || !gameState.shadow) return;
  
  const playerX = gameState.player.position.x;
  const playerY = gameState.player.position.y;
  
  // Find the highest platform below the player
  let shadowY = -2; // Default ground level
  
  gameState.platforms.forEach(platform => {
    const platformTop = platform.y + 0.5;
    const platformLeft = platform.x - platform.width / 2;
    const platformRight = platform.x + platform.width / 2;
    
    // Check if player is horizontally above this platform
    if (playerX >= platformLeft && playerX <= platformRight) {
      // Check if this platform is below the player and higher than current shadow
      if (platformTop <= playerY && platformTop > shadowY) {
        shadowY = platformTop;
      }
    }
  });
  
  // Position shadow directly below player at the surface level
  gameState.shadow.position.x = playerX;
  gameState.shadow.position.y = shadowY + 0.05; // Slightly above surface to prevent z-fighting
  
  // Adjust shadow opacity based on height above ground
  const heightAboveGround = playerY - shadowY;
  const maxHeight = 10;
  const opacity = Math.max(0.1, 0.3 - (heightAboveGround / maxHeight) * 0.2);
  gameState.shadow.material.opacity = opacity;
}

// Initialize game
async function init() {
  // Create player sprite
  gameState.player = await createPlayer();
  
  // Create shadow
  gameState.shadow = createShadow();
  
  // Create Mario-style platforms
  gameState.platforms.push(createPlatform(0, 0, 8, 1));     // Ground
  gameState.platforms.push(createPlatform(-8, 2, 4, 1));    // Left platform
  gameState.platforms.push(createPlatform(8, 2, 4, 1));     // Right platform
  gameState.platforms.push(createPlatform(0, 4, 3, 1));     // High platform
  gameState.platforms.push(createPlatform(-15, 1, 3, 1));   // Far left
  gameState.platforms.push(createPlatform(15, 3, 3, 1));    // Far right
  gameState.platforms.push(createPlatform(4, 6, 2, 1));     // Very high
  gameState.platforms.push(createPlatform(-4, 6, 2, 1));    // Very high left
  gameState.platforms.push(createPlatform(12, 5, 2, 1));    // High right
  gameState.platforms.push(createPlatform(-12, 4, 2, 1));   // High left
  
  // Create background
  createBackground();
  
  // Setup audio
  setupAudio();
  
  // Load sword sound effect
  loadSwordSfx();
  
  // Load whisper sound effect
  loadWhisperSfx();
  
  // Load ghost gone sound effect
  loadGhostGoneSfx();
  
  // Position camera for 2.5D side view
  camera.position.set(0, 5, 15);
  camera.lookAt(0, 3, 0);
}

// Input handling
function setupControls() {
  document.addEventListener('keydown', (event) => {
    gameState.keys[event.code] = true;
    
    // Handle attack (J key)
    if (event.code === 'KeyJ') {
      performAttack();
    }
  });
  
  document.addEventListener('keyup', (event) => {
    gameState.keys[event.code] = false;
  });
}

// Physics and movement
let lastTime = 0;
function updatePhysics(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  const player = gameState.player;
  if (!player) return;
  
  // Update attack state
  updateAttack(deltaTime);
  
  // Update shadow position
  updateShadow();
  
  // Update shadow creatures
  updateShadowCreatures(deltaTime);
  
  // Check for shadow creature attacks
  checkShadowAttackCollision();
  
  // Flickering fire light effect
  const fireLight = scene.getObjectByName ? scene.children.find(child => child.isPointLight) : null;
  if (fireLight) {
    fireLight.intensity = 1.2 + Math.sin(currentTime * 0.01) * 0.3 + Math.random() * 0.2;
  }
  
  const speed = 0.2;
  const jumpPower = 0.3;
  const gravity = -0.02;
  
  // Horizontal movement with sprite flipping
  if (gameState.keys['KeyA']) {
    gameState.velocity.x = -speed;
    if (gameState.facingRight) {
      gameState.facingRight = false;
      player.material.map.wrapS = THREE.RepeatWrapping;
      player.material.map.repeat.x = -1;
      player.material.map.offset.x = 1;
    }
  } else if (gameState.keys['KeyD']) {
    gameState.velocity.x = speed;
    if (!gameState.facingRight) {
      gameState.facingRight = true;
      player.material.map.repeat.x = 1;
      player.material.map.offset.x = 0;
    }
  } else {
    gameState.velocity.x *= 0.85; // Friction
  }
  
  // Jumping
  if (gameState.keys['KeyW'] && gameState.onGround) {
    gameState.velocity.y = jumpPower;
    gameState.onGround = false;
  }
  
  // Apply gravity
  gameState.velocity.y += gravity;
  
  // Update position
  player.position.x += gameState.velocity.x;
  player.position.y += gameState.velocity.y;
  
  // Platform collision detection
  gameState.onGround = false;
  const playerBounds = {
    x: player.position.x,
    y: player.position.y - 1.5, // Bottom of player
    width: 1.8,
    height: 3
  };
  
  gameState.platforms.forEach(platform => {
    const platformBounds = {
      x: platform.x,
      y: platform.y + 0.5, // Top of platform
      width: platform.width,
      height: platform.height
    };
    
    // Check if player is above platform and falling
    if (Math.abs(playerBounds.x - platformBounds.x) < (platformBounds.width / 2 + playerBounds.width / 2) &&
        playerBounds.y <= platformBounds.y + 0.2 &&
        playerBounds.y >= platformBounds.y - 1 &&
        gameState.velocity.y <= 0) {
      
      player.position.y = platformBounds.y + 1.5;
      gameState.velocity.y = 0;
      gameState.onGround = true;
    }
  });
  
  // Reset if player falls too far
  if (player.position.y < -10) {
    player.position.set(0, 3, 0);
    gameState.velocity = { x: 0, y: 0 };
  }
  
  // Camera follow player (side-scrolling)
  const targetX = player.position.x;
  camera.position.x += (targetX - camera.position.x) * 0.08;
}

// Game loop
function animate(currentTime) {
  requestAnimationFrame(animate);
  updatePhysics(currentTime);
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add UI instructions
const instructions = document.createElement('div');
instructions.innerHTML = `
  <div style="position: fixed; top: 20px; left: 20px; color: #ff9466; font-family: Arial; font-size: 16px; z-index: 1000;">
    <div style="background: rgba(42,24,16,0.9); padding: 15px; border-radius: 8px; border: 2px solid #ff6b47; box-shadow: 0 0 20px rgba(255,100,71,0.3);">
      <h3 style="margin: 0 0 10px 0; color: #ffaa88;">The War For Relios Vol 1: The Forest of Fenhaven</h3>
      <div>🗡️ <strong>A</strong> - Move Left</div>
      <div>🗡️ <strong>D</strong> - Move Right</div>
      <div>⬆️ <strong>W</strong> - Jump</div>
      <div>🔥 <strong>J</strong> - Attack (quick slash)</div>
      <div style="margin-top: 8px; font-size: 14px; color: #cc7755;">Navigate the war-torn forest at dusk! Fires burn in the distance.</div>
    </div>
  </div>
`;
document.body.appendChild(instructions);

// Start the game
init();
setupControls();
animate();