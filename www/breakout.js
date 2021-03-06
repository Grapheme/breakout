//=============================================================================
// Breakout
//=============================================================================

Breakout = {

  Defaults: {

    fps: 120,
    stats: false,

    score: {
      lives: {
        initial: 3,
        max: 5
      }
    },

    court: {
      xchunks: 30,
      ychunks: 25
    },

    ball: {
      radius:  0.7,
      speed:   25,
      labels: {
        3: { text: 'ЦЕЛЬ 10 000 БАЛЛОВ', fill: '#fff', stroke: '#fff', font: 'normal 34pt UnicumCondLight' },
        2: { text: '2', fill: '#fff', stroke: '#fff', font: 'normal 34pt ds-digitalbold' },
        1: { text: '1', fill: '#fff', stroke: '#fff', font: 'normal 34pt ds-digitalbold' }
      }
    },

    paddle: {
      width:  6,
      height: 1,
      speed:  20
    },

    color: {
      background: 'transparent',
      foreground: 'transparent',
      border:     'transparent',
      wall:       'transparent',
      ball:       'transparent',
      paddle:     'rgb(245,111,37)',
      score:      "#ffffff",
      highscore:  "transparent"
    },

    state: {
      initial: 'menu',
      events: [
        { name: 'play',    from: 'menu', to: 'game' },
        { name: 'abandon', from: 'game', to: 'menu' },
        { name: 'lose',    from: 'game', to: 'menu' }
    ]},

    keys: [
      { keys: [Game.KEY.LEFT,  Game.KEY.A],      mode: 'down',  action: function() { this.paddle.moveLeft();          } },
      { keys: [Game.KEY.RIGHT, Game.KEY.D],      mode: 'down',  action: function() { this.paddle.moveRight();         } },
      { keys: [Game.KEY.LEFT,  Game.KEY.A],                     action: function() { this.paddle.stopMovingLeft();    } },
      { keys: [Game.KEY.RIGHT, Game.KEY.D],                     action: function() { this.paddle.stopMovingRight();   } },
      { keys: [Game.KEY.SPACE, Game.KEY.RETURN], state: 'menu', action: function() { this.play();                     } },
      { keys: [Game.KEY.SPACE, Game.KEY.RETURN], state: 'game', action: function() { this.ball.launchNow();           } },
      { key:  Game.KEY.ESC,                      state: 'game', action: function() { this.abandon();                  } },
      { key:  Game.KEY.UP,                       state: 'menu', action: function() { this.nextLevel();                } },
      { key:  Game.KEY.DOWN,                     state: 'menu', action: function() { this.prevLevel();                } }
    ],

    sounds: {
      brick:    '/sound/breakout/brick.mp3',
      paddle:   '/sound/breakout/paddle.mp3',
      go:       '/sound/breakout/go.mp3',
      levelup:  '/sound/breakout/levelup.mp3',
      loselife: '/sound/breakout/loselife.mp3',
      gameover: '/sound/breakout/gameover.mp3'
    }

  },

  //-----------------------------------------------------------------------------

  initialize: function(runner, cfg) {
    this.cfg     = cfg;
    this.runner  = runner;
    /*this.width   = runner.width;
    this.height  = runner.height;*/
    this.filter  = false;
    this.smoke   = false;
    this.crush   = false;
    this.win_    = false;
    this.width   = 1024;
    this.height  = 768;
    this.storage = runner.storage();
    this.color   = cfg.color;
    this.sound   = true; // (this.storage.sound == "true");
    this.court   = Object.construct(Breakout.Court,  this, cfg.court);
    this.paddle  = Object.construct(Breakout.Paddle, this, cfg.paddle);
    this.ball    = Object.construct(Breakout.Ball,   this, cfg.ball);
    this.score   = Object.construct(Breakout.Score,  this, cfg.score);
    this.score.reset();
    Game.loadSounds({sounds: cfg.sounds});
  },

  onstartup: function() { // the event that fires the initial state transition occurs when Game.Runner constructs our StateMachine
    this.addEvents();
    this.runner.start(); // start the 60fps update/draw game loop
    this.score.reset();
  },

  addEvents: function() {
    Game.addEvent('prev',  'click',  this.prevLevel.bind(this, false));
    Game.addEvent('next',  'click',  this.nextLevel.bind(this, false));
    Game.addEvent('sound', 'change', this.toggleSound.bind(this, false));
    
    Game.addEvent('btn_speed',        'click', this.restoreSpeed.bind(this));
    Game.addEvent('btn_speed',        'touchstart', this.restoreSpeed.bind(this));
    Game.addEvent('btn_smoke',        'click', this.restoreSmoke.bind(this));
    Game.addEvent('btn_smoke',        'touchstart', this.restoreSmoke.bind(this));
    Game.addEvent('btn_smell',        'click', this.restoreSmell.bind(this, false));
    Game.addEvent('btn_smell',        'touchstart', this.restoreSmell.bind(this, false));
    Game.addEvent('refresh',          'click', this.restart.bind(this));
    Game.addEvent('refresh',          'touchstart', this.restart.bind(this));

    Game.addEvent('instructions',     'touchstart', this.play.bind(this));
    Game.addEvent(this.runner.canvas, 'touchmove',  this.ontouchmove.bind(this));
    Game.addEvent(document.body,      'touchmove',  function(event) { event.preventDefault(); }); // prevent ipad bouncing up and down when finger scrolled
  },

  toggleSound: function() {
    this.storage.sound = this.sound = !this.sound;
  },

  update: function(dt) {
    this.court.update(dt);
    this.paddle.update(dt);
    this.ball.update(dt);
    this.score.update(dt);
  },

  draw: function(ctx) {
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.color.background;
    ctx.fillRect(0, 0, this.width, this.height);
    this.court.draw(ctx);
    this.paddle.draw(ctx);
    this.ball.draw(ctx);
    this.score.draw(ctx);
    ctx.restore();
  },

  onresize: function(width, height) {
    this.width  = width;
    this.height = height;
    this.court.resize();
    this.paddle.reset();
    this.ball.reset();
  },

  onmenu: function() {
    this.resetLevel();
    this.paddle.reset();
    this.ball.reset();
    this.refreshDOM();
  },

  ongame: function() {
    this.refreshDOM();
    this.score.reset();
    this.ball.reset({launch: true});
    window.interval_ = setInterval(ballInterval, 1000);
    $('btn_speed').hide();
    $('gps_ring').hide();
  },

  onlose: function() {
    this.playSound('gameover');
    
    this.filter = false;
    this.smoke = false;
    this.crush = false;

    for (var i = 1; i <= 41; i++) {
      $('grow'+i).style.left = '-200px';
      $('grow'+i).removeClassName('animate');
    }

    $('btn_speed').hide();
    $('btn_smoke').hide();
    $('btn_smell').hide();
    $('gps_ring').hide();
    $('image_').hide();

    $('counter').hide();
    $('refresh').hide();
    $('switcher').hide();
    $('switcher2').hide();
    $('crown').hide();

    $('cl1').removeClassName('active');
    $('cl2').removeClassName('active');
    $('cl3').removeClassName('active');
    $('cl4').removeClassName('active');
    $('cl5').removeClassName('active');

    $('counter').innerText = 60;
    clearInterval(window.interval_);
    clearInterval(window.crint);

    if (this.score.score > result_ || this.win_) {
      $('total-score-3').innerText = this.score.score;
      $('gameover_3').show();
      setTimeout(function() { $('gameover_3').hide(); $('night').show(); }, 4000);    
    } else if (this.court.empty()) {
      $('total-score-3').innerText = this.score.score;
      $('gameover_3').show();
      setTimeout(function() { $('gameover_3').hide(); $('night').show(); }, 4000);    
    } else if (window.counter == 60) {
      $('total-score-2').innerText = this.score.score;
      $('gameover_2').show();
      setTimeout(function() { $('gameover_2').hide(); $('night').show(); }, 4000);    
    } else {
      $('total-score-1').innerText = this.score.score;
      $('gameover_1').show();
      setTimeout(function() { $('gameover_1').hide(); $('night').show(); }, 4000);    
    }    
    setTimeout(function() { /*$('night').hide(); $('start-screen').show();*/ window.location.reload(); }, 10000);    
    window.counter = 60;
    this.win_ = false;
  },

  onleavegame: function() {
    this.score.save();
    this.score.resetLives();
  },

  onbeforeabandon: function() {
    return this.runner.confirm("Abandon game?")
  },

  loseBall: function() {
    this.playSound('loselife');
    if (this.score.loseLife())
      this.lose();
    else {
      this.ball.reset({launch: true});
    }
  },

  winLevel: function() {
    this.playSound('levelup');
    this.score.gainLife();
    this.nextLevel(true);
    this.ball.reset({launch: true});
  },

  hitBrick: function(brick) {
    //window.console.log(brick.c);
    //ps_ = getRandomInt(1,3);
    if (brick.c === 'k' || brick.c === 'K') {
      if (false === this.filter && false === this.smoke && false === this.crush) {
        ps_ = ps_ + 1;
        switch (ps_) {
           case 1:
              //window.console.log('Filter');
              this.filter = true;
              break;
           case 2:
              //window.console.log('Smoke');
              this.smoke = true;
              $('cl1').addClassName('active');
              setTimeout(function() { if (game.smoke) { $('cl2').addClassName('active'); }}, 500);
              setTimeout(function() { if (game.smoke) { $('cl3').addClassName('active'); }}, 1000);
              setTimeout(function() { if (game.smoke) { $('cl4').addClassName('active'); }}, 1500);
              setTimeout(function() { if (game.smoke) { $('cl5').addClassName('active'); }}, 2000);
              $('btn_smoke').show();
              $('gps_ring').show();
              break;
          /*
           case 3:
              this.crush = true;
              $('btn_smell').show();
              $('gps_ring').show();
              $('image_').show();
              smokePos.style.left = game.paddle.x + game.paddle.w - 90 + 'px';
              crint = setInterval(function(){
                if ( game.paddle.w > 90 ) {
                  game.paddle.w = game.paddle.w - 2;
                  game.paddle.rerender = true;
                  var curPos = parseInt(smokePos.style.left);
                  smokePos.style.left = (curPos - 2) + 'px';
                } else {
                  game.loseBall();
                  game.restoreSmell(true);
                  clearInterval(crint);
                }
              }, 100);
              break;
            */
        }
        // -- remove 3rd property 
        // if (ps_ == 3) { ps_ = 0; }
        if (ps_ == 2) { ps_ = 0; }
        this.paddle.rerender = true;
        this.court.remove(brick);
      }
    }

    if (false === this.filter && false === this.smoke && false === this.crush) {
        if (brick.c === 'l' || brick.c === 'L') {
            this.score.increase(brick.score * 15);
        } else {
            this.score.increase(brick.score);
        }
        this.court.remove(brick);
        this.ball.speed += 50 * (1 - (this.ball.speed / this.ball.maxspeed)); // decay curve - speed increases less the faster the ball is (otherwise game becomes impossible)
    }
    
    this.playSound('brick');
    
    if (this.court.empty()) {
      this.win_ = true;
      this.lose();
      //this.winLevel();
    }
  },

  resetLevel: function() { this.setLevel(); },
  setLevel: function(level) {
    level = (typeof level == 'undefined') ? (this.storage.level ? parseInt(this.storage.level) : 0) : level;
    level = level < Breakout.Levels.length ? level : 0;
    // hack for iPad
    level = 5;
    this.court.reset(level);
    this.storage.level = this.level = level;
    this.refreshDOM();
  },

  canPrevLevel: function()      { return this.is('menu') && (this.level > 0);                          },
  canNextLevel: function()      { return this.is('menu') && (this.level < (Breakout.Levels.length-1)); },
  prevLevel:    function(force) { if (force || this.canPrevLevel()) this.setLevel(this.level - 1);     },
  nextLevel:    function(force) { if (force || this.canNextLevel()) this.setLevel(this.level + 1);     },
  restoreSpeed: function()      { this.filter = false; this.paddle.rerender = true; this.ball.speed = 650; this.ball.launchNow(); $('btn_speed').hide(); $('gps_ring').hide(); },
  restoreSmoke: function()      { this.smoke = false; $('btn_smoke').hide(); $('gps_ring').hide(); $('cl1').removeClassName('active'); $('cl2').removeClassName('active'); $('cl3').removeClassName('active'); $('cl4').removeClassName('active'); $('cl5').removeClassName('active'); },
  restoreSmell: function(force) { this.crush = false; $('btn_smell').hide(); $('gps_ring').hide(); $('image_').hide(); clearInterval(crint); this.paddle.w = 270; this.paddle.rerender = true; this.ball.speed = 650; if (!force) { this.ball.launchNow(); } else { this.ball.reset({launch: true}); } },
  restart:      function()      { this.lose(); },

  initCanvas: function(ctx) { // called by Game.Runner whenever the canvas is reset (on init and on resize)
    ctx.fillStyle    = this.color.foreground;
    ctx.strokeStyle  = this.color.foreground;
    ctx.lineWidth    = 1;
    this.score.measure(ctx);  // score needs to measure itself
  },

  refreshDOM: function() {
    $('instructions').className = Game.ua.hasTouch ? 'touch' : 'keyboard';
    $('instructions').showIf(this.is('menu'));
    $('prev').toggleClassName('disabled', !this.canPrevLevel());
    $('next').toggleClassName('disabled', !this.canNextLevel());
    $('level').update(this.level + 1);
    $('sound').checked = this.sound;
  },

  playSound: function(id) {
    if (soundManager && this.sound) {
      soundManager.play(id);
    }
  },

  ontouchmove: function(ev) {
    if (ev.targetTouches.length == 1) {
      this.paddle.place(ev.targetTouches[0].pageX - this.runner.bounds.left - this.paddle.w/2); // clientX only works in ios, not on android - must use pageX - yuck
    }
  },

  //=============================================================================

  Score: {

    initialize: function(game, cfg) {
      this.game = game;
      this.cfg  = cfg;
      this.load();
      this.reset();
    },

    reset:    function()  { this.set(0); this.resetLives(); },
    set:      function(n) { this.score = this.vscore = n; this.rerender = true; },
    increase: function(n) { this.score = this.score + n;  this.rerender = true; },
    format:   function(n) { return ("00000" + n).slice(-7); },
    load:     function()  { this.highscore = this.game.storage.highscore ? parseInt(this.game.storage.highscore) : 1000; },
    save:     function()  { if (this.score > this.highscore) this.game.storage.highscore = this.highscore = this.score;  },

    resetLives: function()  { this.setLives(this.cfg.lives.initial);                       }, 
    setLives:   function(n) { this.lives = n; this.rerender = true;                        },
    gainLife:   function()  { this.setLives(Math.min(this.cfg.lives.max, this.lives + 1)); },
    loseLife:   function()  { 
      if (true === this.game.crush) {
        clearInterval(window.crint); 
        this.game.crush = false;
        this.game.paddle.w = 270; 
        $('btn_smell').hide(); 
        $('gps_ring').hide();
        $('image_').hide();
      }
      this.game.filter = false; 
      this.game.smoke = false; 
      this.game.paddle.rerender = true; 
      this.setLives(this.lives-1); 
      return (this.lives == 0);  
    },
 
    update: function(dt) {
      //if (this.score > result_) {
      //  this.game.lose();
      //}
      if (this.vscore < this.score) {
        this.vscore = Math.min(this.score, this.vscore + 10);
        this.rerender = true;
      }
    },

    measure: function(ctx) {
      //console.log('measure');
      this.left   = this.game.court.left;
      this.top    = this.game.court.top - this.game.court.wall.size*2;
      this.width  = this.game.court.width;
      this.height = this.game.court.wall.size*2;
      this.scorefont = "bold " + Math.max(9, this.game.court.wall.size - 2) + "pt 'ds-digitalbold'";
      this.highfont  = ""      + Math.max(9, this.game.court.wall.size - 8) + "pt 'ds-digitalbold'";
      ctx.save();
      ctx.font = this.scorefont;
      this.scorewidth = ctx.measureText(this.format(0)).width;
      ctx.font = this.highfont;
      this.highwidth  = ctx.measureText("HIGH SCORE: " + this.format(0)).width;
      ctx.restore();
      this.rerender = true;
    },

    draw: function(ctx) {
      if (this.rerender) {
        this.canvas = Game.renderToCanvas(this.width, this.height, this.render.bind(this), this.canvas);
        this.rerender = false;
      }
      ctx.drawImage(this.canvas, this.left, this.top);
    },

    render: function(ctx) {
      var text, width, paddle;
      var ishigh = this.game.is('game') && (this.score > this.highscore);

      ctx.textBaseline = "middle";
      ctx.fillStyle    = this.game.color.score;
      ctx.font         = this.scorefont;
      text             = this.format(this.vscore);
      ctx.fillText(text, 50, this.height/2);

      ctx.fillStyle = ishigh ? this.game.color.score : this.game.color.highscore;
      text          = ""; //"HIGH SCORE: " + this.format(ishigh ? this.score : this.highscore);
      ctx.font      = this.highfont;
      width         = ctx.measureText(text).width;
      ctx.fillText(text, this.width - width, this.height/2);

      paddle = {
        game: this.game,
        w:    this.game.court.chunk,
        h:    this.game.court.chunk,
        r:    10,
        color: '#d99540',
      }
      ctx.translate(this.scorewidth + 20, (this.height-paddle.h) / 2);
      for(var n = 0 ; n < this.lives ; n++) {
        this.game.paddle.render.call(paddle, ctx);
        ctx.translate(paddle.w + 5, 0);
      }

    }

  },

  //=============================================================================

  Court: {

    initialize: function(game, cfg) {
      this.game = game;
      this.cfg  = cfg;
    },
    
    reset: function(level) {
      var layout = Breakout.Levels[level];
      var line, brick, score, c, n, x, y, nx, ny = Math.min(layout.bricks.length, this.cfg.ychunks);
      this.bricks = [];
      for(y = 0 ; y < ny ; y++) {
        score = (this.cfg.ychunks - y) * 5;
        line  = layout.bricks[y] + " "; // extra space simplifies loop
        brick = null;
        nx = Math.min(line.length, this.cfg.xchunks + 1);
        for(x = 0 ; x < nx ; x++) {
          c = line[x];
          if (brick && (brick.c == c)) {
            brick.pos.x2 = x;
          }
          else if (brick && (brick.c != c)) {
             this.bricks.push(brick);
            brick = null;
          }

          if (!brick && (c != ' '))
            brick = { isbrick: true, hit: false, c: c, pos: { x1: x, x2: x, y: y }, score: score, color: layout.colors[c.toLowerCase()] };
        }
      }
      this.numbricks = this.bricks.length;
      this.numhits   = 0;
      this.resize();
    },

    resize: function() {

      this.chunk  = Math.floor(Math.min(this.game.width, this.game.height) / (Math.max(this.cfg.xchunks, this.cfg.ychunks) + 4)); // room for court plus 2 chunk wall either side
      this.width  = 1025;//this.cfg.xchunks * this.chunk;
      this.height = window.innerHeight-100;//this.cfg.ychunks * this.chunk;
      /*this.width = window.innerWidth - 5;
      this.height = window.innerHeight-80;*/
      this.left   = -1; //Math.floor((this.game.width  - this.width)  / 2);
      this.top    = 50; //Math.floor((this.game.height - this.height) / 2);
      this.right  = this.left + this.width;
      this.bottom = this.top  + this.height;

      this.wall = {}
      this.wall.size  = this.chunk;
      this.wall.top   = Game.Math.bound({x: this.left - this.wall.size, y: this.top - this.wall.size*2, w: this.width + this.wall.size*2, h: this.wall.size*2               });
      this.wall.left  = Game.Math.bound({x: this.left - this.wall.size, y: this.top - this.wall.size*2, w: this.wall.size,                h: this.wall.size*2 + this.height });
      this.wall.right = Game.Math.bound({x: this.right,                 y: this.top - this.wall.size*2, w: this.wall.size,                h: this.wall.size*2 + this.height });

      for(n = 0 ; n < this.numbricks ; n++) {
        brick = this.bricks[n];
        //brick.x = this.left + (brick.pos.x1 * this.chunk * 1.85);
        brick.x = this.left + (brick.pos.x1 * this.chunk * 1.85) - 70;
        brick.y = this.top  + (brick.pos.y  * this.chunk * 1.85);
        brick.w = (brick.pos.x2 - brick.pos.x1 + 1) * this.chunk * 1.85;
        brick.h = this.chunk * 1.85 - 1;
        Game.Math.bound(brick);
      }

      this.rerender = true;
    },

    update: function(dt) {
    },

    draw: function(ctx) {
      if (this.rerender) {
        this.canvas = Game.renderToCanvas(this.game.width, this.game.height, this.render.bind(this), this.canvas);
        this.rerender = false;
      }
      ctx.drawImage(this.canvas, 0, 0);
    },

    render: function(ctx) {
      var n, brick;

      ctx.translate(0.5, 0.5); // crisp 1px lines for the brick borders
      ctx.strokeStyle = this.game.color.border;
      ctx.lineWidth = 1;
      for(n = 0 ; n < this.numbricks ; n++) {
        brick = this.bricks[n];
        if (!brick.hit) {
          ctx.fillStyle = brick.color; //'rgba(255, 255, 255, 0.25)'; //brick.color;
          ctx.strokeStyle = brick.color; //'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h); 
          ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
          var imageObj = new Image();
          if (brick.c === 'l' || brick.c === 'L') {
            imageObj.src = 'images/brick_good.png';
            ctx.drawImage(imageObj, brick.x, brick.y, brick.w, brick.h);
          } else if (brick.c === 'k' || brick.c === 'K') {
            imageObj.src = 'images/brick_bad.png';
            ctx.drawImage(imageObj, brick.x, brick.y, brick.w, brick.h);
          } else {
            imageObj.src = 'images/brick_normal.png';
            ctx.drawImage(imageObj, brick.x, brick.y, brick.w, brick.h);
          }
        }
      }

      ctx.fillStyle = this.game.color.wall;
      ctx.lineTo(this.wall.right.left,   this.wall.right.bottom);
      ctx.lineTo(this.wall.right.left,   this.wall.top.bottom);
      ctx.lineTo(this.wall.left.right,   this.wall.top.bottom);
      ctx.lineTo(this.wall.left.right,   this.wall.left.bottom);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    },

    remove: function(brick) {
      //console.log('HIT');
      brick.animate = 1;
      brick.hit = true;
      this.numhits++;
      this.rerender = true;
      
      var brick__ = $('brick');
      brick__.style.top = brick.top+'px';
      brick__.style.left = brick.left+'px';

      bricks_count++;
      var grow_ = $('grow'+bricks_count);

      if (brick.c === 'k' || brick.c === 'K') {
        grow_.innerText = '';
      } else {
        grow_.innerText = '+ ' + brick.score;
      }
      grow_.style.top = brick.top-80+'px'
      grow_.style.left = brick.left+40+'px'
      grow_.addClassName('animate');

      brickCount = 0;
      animateBrick();
    },

    empty: function() {
      return (this.numhits == this.numbricks);
    }

  },

  //=============================================================================

  Ball: {

    initialize: function(game, cfg) {
      this.game = game;
      this.cfg  = cfg;
    },

    reset: function(options) {
      this.radius   = 20; // this.cfg.radius * this.game.court.chunk * 0.85;
      this.speed    = this.cfg.speed  * this.game.court.chunk;
      this.maxspeed = this.speed * 1.5;
      this.color    = this.game.color.ball;
      this.moveToPaddle();
      this.setdir(0, 0);
      this.clearLaunch();
      this.hitTargets = [
        this.game.paddle,
        this.game.court.wall.top,
        this.game.court.wall.left,
        this.game.court.wall.right,
      ].concat(this.game.court.bricks);
      if (options && options.launch) {
        this.launch();
      }
    },

    moveToPaddle: function() {
      this.setpos(this.game.paddle.left + (this.game.paddle.w/2), this.game.court.bottom - this.game.paddle.h - this.radius);
    },

    setpos: function(x, y) {
      this.x = x;
      this.y = y;
      Game.Math.bound(this);
    },

    setdir: function(dx, dy) {
      var dir = Game.Math.normalize({ x: dx, y: dy });
      this.dx = dir.x;
      this.dy = dir.y;
      this.moving = dir.m != 0;
    },

    launch: function() {
      $('start-screen').hide();
      if (!this.moving || this.countdown) {
        this.countdown = (typeof this.countdown == 'undefined') || (this.countdown == null) ? 3 : this.countdown - 1;
        if (this.countdown > 0) {
          this.label = this.launchLabel(this.countdown);
          this.delayTimer = setTimeout(this.launch.bind(this), 1000);
          if (this.countdown == 1)
            this.setdir(1, -1); // launch on 'go'
        }
        else {
          this.clearLaunch();
        }
      }
    },

    launchNow: function() { // <space> key can override countdown launch
      if (!this.moving) {
        this.clearLaunch();
        this.setdir(1, -1);
      }
    },

    launchLabel: function(count) {
      var label       = this.cfg.labels[count];
      var ctx         = this.game.runner.front2d; // dodgy getting the context this way, should probably have a Game.Runner.ctx() method ?
      ctx.save();
      ctx.font        = label.font;
      ctx.fillStyle   = label.fill;
      ctx.strokeStyle = label.stroke;
      ctx.lineWidth   = 0.5;
      var width       = ctx.measureText(label.text).width;
      ctx.restore();
      label.x         = this.game.court.left +   (this.game.court.width - width)/2;
      label.y         = this.game.paddle.top - 60;
      return label;
    },

    clearLaunch: function() {
      if (this.delayTimer) {
        clearTimeout(this.delayTimer);
        this.delayTimer = this.label = this.countdown = null;
      }
    },

    update: function(dt) {

      if (!this.moving)
        return this.moveToPaddle();

      var p2 = Game.Math.move(this.x, this.y, this.dx * this.speed, this.dy * this.speed, dt);

      var mCurrent, mClosest = Infinity, point, item, closest = null;
      for (var n = 0 ; n < this.hitTargets.length ; n++) {
        item = this.hitTargets[n];
        if (!item.hit) {
          point = Game.Math.ballIntercept(this, item, p2.nx, p2.ny);
          if (point) {
            mCurrent = Game.Math.magnitude(point.x - this.x, point.y - this.y);
            if (mCurrent < mClosest) {
              mClosest = mCurrent;
              closest = {item: item, point: point};
            }
          }
        }
      }

      if (closest) {

        if (closest.item.isbrick) {
          this.game.hitBrick(closest.item);
          if (!this.moving) // if hitBrick caused game to end we dont want to continue updating our state
            return;
        }

        if ((closest.item == this.game.paddle) && (closest.point.d == 'top')) {          
          p2.dx = this.speed * (closest.point.x - (this.game.paddle.left + this.game.paddle.w/2)) / (this.game.paddle.w/2);
          this.game.playSound('paddle');
          if (true === this.game.filter) {
            this.game.ball.speed = 0;
            $('btn_speed').show();
            $('gps_ring').show();
          }
          if (true === this.game.crush) {
            this.game.ball.speed = 0;
          }
        }

        this.setpos(closest.point.x, closest.point.y);

        switch(closest.point.d) {
          case 'left':
          case 'right':
            this.setdir(-p2.dx, p2.dy);
            break;

          case 'top':
          case 'bottom':
            this.setdir(p2.dx, -p2.dy);
            break;
        }

        var udt = dt * (mClosest / Game.Math.magnitude(p2.nx, p2.ny)); // how far along did we get before intercept ?
        return this.update(dt - udt);                                  // so we can update for time remaining
      }

      if ((p2.x < 0) || (p2.y < 0) || (p2.x > this.game.width) || (p2.y > this.game.height)) {
        this.game.loseBall();
      }
      else {
        this.setpos(p2.x,  p2.y);
        this.setdir(p2.dx, p2.dy);
      }

    },

    draw: function(ctx) {
      var gradient = ctx.createRadialGradient(238, 50, 10, 238, 50, 300);
      gradient.addColorStop(0, 'rgb(207,204,207)');
      gradient.addColorStop(1, 'rgb(255,254,254)');

      /*
      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#d99540';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Game.THREESIXTY, true);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      */

      var imageObj = new Image();
      imageObj.src = 'images/ball.png';
      ctx.drawImage(imageObj, this.x, this.y-21, 41, 41);

      if (this.label) {
        ctx.font = this.label.font;
        ctx.fillStyle = this.label.fill;
        ctx.strokeStyle = this.label.stroke;
        ctx.lineWidth = 0.5;
        ctx.fillText(this.label.text,   this.label.x, this.label.y - 50);
        ctx.strokeText(this.label.text, this.label.x, this.label.y - 50);
      }
    }

  },

  //=============================================================================

  Paddle: {
    initialize: function(game, cfg) {
      this.game = game;
      this.cfg  = cfg;
    },

    reset: function() {
      this.speed  = this.cfg.speed  * this.game.court.chunk;
      this.w      = 274; //this.cfg.width  * this.game.court.chunk;
      this.h      = 65;  //this.cfg.height * this.game.court.chunk;
      this.r      = 5;
      this.minX   = this.game.court.left;
      this.maxX   = this.game.court.right - this.w;
      this.setpos(Game.random(this.minX, this.maxX), this.game.court.bottom - this.h);
      this.setdir(0);
      this.rerender = true;
    },

    setpos: function(x, y) {
      this.x      = x;
      this.y      = y;
      Game.Math.bound(this);
    },

    setdir: function(dx) {
      this.dleft  = (dx < 0 ? -dx : 0);
      this.dright = (dx > 0 ?  dx : 0);
    },

    place: function(x) {
      this.setpos(Math.min(this.maxX, Math.max(this.minX, x)), this.y);
      smokePos.style.left = x + game.paddle.w - 90 + 'px';
    },

    update: function(dt) {
      var amount = this.dright - this.dleft;
      if (amount != 0)
        this.place(this.x + (amount * dt * this.speed));
    },

    draw: function(ctx) {
      if (this.rerender) {
        this.canvas = Game.renderToCanvas(this.w, this.h, this.render.bind(this));
        this.rerender = false;
      }
      if (true === this.game.filter) {
        ctx.drawImage(this.canvas, this.x, this.y - 25);  
      } else {
        ctx.drawImage(this.canvas, this.x, this.y);
      }
    },

    render: function(ctx) {

      var gradient = ctx.createLinearGradient(0, this.h, 0, 0);
      var r = this.r;

      if (undefined === this.color) {
        if (true === game.filter || true === game.crush) {
          /*
          gradient.addColorStop(0, 'rgb(190,190,190)');
          gradient.addColorStop(0.3, 'rgb(140,140,140)');
          gradient.addColorStop(0.6, 'rgb(140,140,140)');
          gradient.addColorStop(1, 'rgb(200,200,200)');
          */
          var imageObj = new Image();
          imageObj.onload = function() {
            ctx.drawImage(imageObj, r, 0);  
          };
          imageObj.src = 'images/filter_crashed.png';
          

        } else {
          gradient.addColorStop(0, 'rgb(207,204,207)');
          gradient.addColorStop(0.2, 'rgb(191,188,186)');
          gradient.addColorStop(0.75, 'rgb(248,246,246)');
          gradient.addColorStop(1, 'rgb(255,254,254)');
        //}
          ctx.fillStyle = gradient;
          ctx.strokeStyle = this.game.color.border;
          ctx.beginPath();
          ctx.moveTo(r,  0);
          ctx.lineTo(this.w - r, 0);
          ctx.arcTo(this.w, 0, this.w, r, r);
          ctx.lineTo(this.w, 32 - r);
          ctx.arcTo(this.w, 32, this.w - r, 32, r);
          ctx.lineTo(r, 32);
          ctx.arcTo(0, 32, 0, 32 - r, r);
          ctx.lineTo(0, r);
          ctx.arcTo(0, 0, r, 0, r);
          ctx.fill();
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        /*
        ctx.fillStyle = '#f5a330';
        ctx.strokeStyle = '#f5a330';
        ctx.beginPath();
        ctx.arc(0, this.w/2, 8, 0, Game.THREESIXTY, true);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        */

        var imageObj = new Image();
        imageObj.src = 'images/ballS.png';
        ctx.drawImage(imageObj, this.w+60, 4, 14, 14);
      }

    },

    moveLeft:        function() { this.dleft  = 1; },
    moveRight:       function() { this.dright = 1; },  
    stopMovingLeft:  function() { this.dleft  = 0; },
    stopMovingRight: function() { this.dright = 0; }

  }

  //=============================================================================

}; // Breakout

