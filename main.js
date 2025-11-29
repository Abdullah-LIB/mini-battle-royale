// main.js - minimal mobile-friendly battle prototype
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;

window.addEventListener('resize', ()=>{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);

let pointer = {x: W/2, y: H/2, down:false};
['touchstart','touchmove','touchend','mousedown','mousemove','mouseup'].forEach(ev=>{
  window.addEventListener(ev, e=>{
    if(e.type.startsWith('touch')){
      if(e.type==='touchend'){ pointer.down=false; return; }
      const t = e.touches[0];
      pointer.x = t.clientX; pointer.y = t.clientY; pointer.down = true;
    } else {
      if(e.type==='mouseup'){ pointer.down=false; return; }
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.down = true;
    }
    e.preventDefault();
  }, {passive:false});
});

const player = {
  x: W/2, y: H/2, r: 18, speed: 3.2, color:'#4ee',
  hp:100, alive:true, kills:0
};

class Bullet {
  constructor(x,y,dx,dy,owner){
    this.x=x; this.y=y; this.dx=dx; this.dy=dy; this.speed=8; this.r=4; this.owner=owner;
  }
  update(){ this.x += this.dx*this.speed; this.y += this.dy*this.speed; }
  draw(){ ctx.beginPath(); ctx.fillStyle='#ffd'; ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); }
}
class Enemy {
  constructor(x,y){
    this.x=x; this.y=y; this.r=16; this.speed=1.2 + Math.random()*1.2; this.hp=25; this.alive=true;
  }
  update(){
    // simple chase player with a bit of randomness
    const ang = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random()-0.5)*0.4;
    this.x += Math.cos(ang)*this.speed;
    this.y += Math.sin(ang)*this.speed;
  }
  draw(){ ctx.beginPath(); ctx.fillStyle='#f55'; ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); }
}

let bullets = [], enemies = [], lastShot = 0, spawnTimer = 0;
function spawnEnemy(){
  // spawn from edges
  const side = Math.floor(Math.random()*4);
  let x,y;
  if(side===0){ x = Math.random()*W; y = -30; }
  if(side===1){ x = Math.random()*W; y = H+30; }
  if(side===2){ x = -30; y = Math.random()*H; }
  if(side===3){ x = W+30; y = Math.random()*H; }
  enemies.push(new Enemy(x,y));
}

function shoot(x,y,targetX,targetY,owner){
  const dx = targetX - x; const dy = targetY - y;
  const len = Math.hypot(dx,dy)||1;
  bullets.push(new Bullet(x, y, dx/len, dy/len, owner));
}

function update(dt){
  if(!player.alive) return;
  // move player toward pointer when touching
  if(pointer.down){
    const dx = pointer.x - player.x, dy = pointer.y - player.y;
    const len = Math.hypot(dx,dy);
    if(len>4){
      player.x += (dx/len) * player.speed;
      player.y += (dy/len) * player.speed;
    }
  }

  // keep inside
  player.x = clamp(player.x, player.r, W-player.r);
  player.y = clamp(player.y, player.r, H-player.r);

  // auto shoot toward pointer occasionally
  lastShot += dt;
  if(pointer.down && lastShot > 120){
    shoot(player.x, player.y, pointer.x, pointer.y, 'player');
    lastShot = 0;
  }

  // update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.update();
    // remove off-screen
    if(b.x<-50||b.x>W+50||b.y<-50||b.y>H+50){ bullets.splice(i,1); continue; }
    // collisions
    if(b.owner==='player'){
      for(let j=enemies.length-1;j>=0;j--){
        const e = enemies[j];
        if(!e.alive) continue;
        if(dist(b,e) < b.r + e.r){
          e.hp -= 12;
          bullets.splice(i,1);
          if(e.hp <= 0){ e.alive=false; enemies.splice(j,1); player.kills++; document.getElementById('kills').innerText = player.kills; }
          break;
        }
      }
    } else {
      // enemy bullets hitting player (not used now)
    }
  }

  // update enemies
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    e.update();
    // enemy touches player
    if(dist(e, player) < e.r + player.r){
      player.hp -= 0.6;
      if(player.hp <= 0){ player.hp = 0; player.alive = false; document.getElementById('hp').innerText = 0; showRestart(); }
      document.getElementById('hp').innerText = Math.max(0, Math.floor(player.hp));
    }
  }

  // spawn logic
  spawnTimer += dt;
  if(spawnTimer > 1100 && enemies.length < 8){
    spawnEnemy();
    spawnTimer = 0;
  }
}

function draw(){
  // clear
  ctx.clearRect(0,0,W,H);
  // draw simple arena
  ctx.save();
  // player
  if(player.alive){
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();
    // direction indicator
    ctx.beginPath();
    ctx.fillStyle = '#0a0';
    ctx.arc(player.x + (pointer.x - player.x)*0.08, player.y + (pointer.y - player.y)*0.08, 5, 0, Math.PI*2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Died', W/2, H/2 - 10);
    ctx.fillText('Kills: ' + player.kills, W/2, H/2 + 26);
  }

  // bullets
  bullets.forEach(b=>b.draw());
  // enemies
  enemies.forEach(e=>e.draw());

  ctx.restore();
}

let last = performance.now();
function loop(t){
  const dt = t - last;
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// helper restart
const restartBtn = document.getElementById('restart');
restartBtn.addEventListener('click', ()=>{ location.reload(); });
function showRestart(){ restartBtn.style.display = 'block'; }

// initial spawns
for(let i=0;i<3;i++) spawnEnemy();

// make the canvas high-DPI friendly
function fixDPI(){
  const ratio = window.devicePixelRatio || 1;
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
fixDPI();
window.addEventListener('resize', fixDPI);
