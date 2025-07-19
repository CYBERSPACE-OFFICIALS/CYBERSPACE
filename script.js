import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader.js';

let scene, camera, renderer, runner, mixer;
let lanes = [-2, 0, 2], lane = 1;
let groundSegments = [], obstacles=[], coins=[], powerUps=[];
let speed = 0.2, score=0, scoreEl, clock = new THREE.Clock();
let isRunning=false, lastSpawn=0;
const container = document.getElementById('game-container');
const loader = new GLTFLoader();

initMenu();

function initMenu(){
  document.getElementById('startBtn').onclick = () => {
    document.getElementById('menu').style.display = 'none';
    startGame();
  }
}

function startGame(){
  initScene();
  loadAssets();
}

function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0,5,10);
  camera.lookAt(0,1,0);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener('keydown', onKey);
  scoreEl = document.getElementById('score');

  let hemi = new THREE.HemisphereLight(0xffffff,0x444444);
  hemi.position.set(0,20,0);
  scene.add(hemi);

  for(let i=0;i<3;i++){
    let g = new THREE.PlaneGeometry(6, 40);
    let m = new THREE.MeshStandardMaterial({color:0x555555});
    let mesh = new THREE.Mesh(g,m);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.z = -20 + i*40;
    scene.add(mesh);
    groundSegments.push(mesh);
  }

  let listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();
  const bgm = new THREE.Audio(listener);
  audioLoader.load('sounds/bgm.mp3', buf => { bgm.setBuffer(buf); bgm.setLoop(true); bgm.setVolume(0.3); bgm.play(); });

  const coinSound = new THREE.Audio(listener);
  audioLoader.load('sounds/coin.mp3', buf => coinSound.setBuffer(buf));

  const powerSound = new THREE.Audio(listener);
  audioLoader.load('sounds/powerup.mp3', buf => powerSound.setBuffer(buf));

  function playSound(arr, sound){ if(arr.includes(runner)) sound.play(); }
  runner = { playSound, coinSound, powerSound };

  isRunning = true;
  clock.start();

  animate();
}

function loadAssets(){
  loader.load('models/runner.glb', gltf => {
    runner.model = gltf.scene;
    scene.add(runner.model);
    mixer = new THREE.AnimationMixer(runner.model);
    if(gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
  });
}

function onKey(e){
  if(e.key==='ArrowLeft' && lane>0) lane--;
  if(e.key==='ArrowRight' && lane<2) lane++;
}

function spawnEntities(){
  const t=clock.getElapsedTime();
  if(t - lastSpawn < 1) return;
  lastSpawn = t;

  if(Math.random()<0.5){ // coin
    let c = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.2,12), new THREE.MeshStandardMaterial({color:0xFFFF00}));
    c.rotation.x=Math.PI/2;
    c.position.set(lanes[Math.floor(Math.random()*3)],1,-50);
    scene.add(c); coins.push(c);
  } else if(Math.random()<0.3){ // powerup
    let p = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({color:0x0000FF}));
    p.position.set(lanes[Math.floor(Math.random()*3)],1,-50);
    scene.add(p); powerUps.push(p);
  } else { // obstacle
    let o = new THREE.Mesh(new THREE.BoxGeometry(1,2,1), new THREE.MeshStandardMaterial({color:0x00FF00}));
    o.position.set(lanes[Math.floor(Math.random()*3)],1,-50);
    scene.add(o); obstacles.push(o);
  }
}

function animate(){
  if(!isRunning) return;
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  mixer?.update(dt);

  if(runner.model){
    const targetX = lanes[lane];
    runner.model.position.x += (targetX - runner.model.position.x)*0.2;
    runner.model.position.y = 0;
    renderer.render(scene, camera);
  }

  groundSegments.forEach(g=>{
    g.position.z += speed*dt*60;
    if(g.position.z > camera.position.z) g.position.z -= 120;
  });

  spawnEntities();

  [...obstacles, ...coins, ...powerUps].forEach(arr=>{
    arr.forEach((e,i)=>{
      e.position.z += speed*dt*60;
      if(e.position.z > camera.position.z + 5){
        scene.remove(e);
        arr.splice(i,1);
        return;
      }
      if(runner.model && Math.abs(e.position.z-runner.model.position.z)<1 && Math.abs(e.position.x-runner.model.position.x)<1){
        if(coins.includes(e)){
          score+=10; runner.coinSound.play();
        } else if(powerUps.includes(e)){
          speed*=1.5; setTimeout(()=>speed/=1.5,5000); runner.powerSound.play();
        } else {
          alert(`Game Over! Final score: ${score}`);
          location.reload(); return;
        }
        scene.remove(e);
        arr.splice(i,1);
      }
    });
  });

  scoreEl.textContent = `Score: ${score}`;
}