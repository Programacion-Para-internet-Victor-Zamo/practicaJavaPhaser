let game;
var scoreText;
var score = 0;
// global game options
let OpcionesJuego = {
    platformSpeedRange: [280, 280],     /// velocidad de la plataforma en pixeles x segundo
    velocidadMontes: 80,                // velocidad de las montañas por segundo
    spawnRange: [80, 300],              // rango de generación, qué tan lejos debe estar la plataforma más a la derecha desde el borde derecho antes de que se genere la siguiente plataforma, en píxeles
    RangoTamPlataforma: [150, 300],      // rango de ancho de plataforma, en píxeles
    AlturaEntreNuevaPlataforma: [-5, 5],// un rango de altura entre la plataforma más a la derecha y la siguiente plataforma que se generará
    EscalaAlturaPlataforma: 20,         // una escala que se multiplicará por platformHeightRange
    LimVerticalPlataforma: [0.4, 0.8],  // altura máxima y mínima de la plataforma, como relación de altura de la pantalla
    GravedadJugador: 900,               // gravedad del jugador
    FuerzaDelSalto: 400,                // fuerza del salto
    Posicion_Inicio: 200,               // posicion de inicio
    SaltosPermitidos: 2,                // saltos consecutivos permitidos
    Porcentaje_monedas: 50              // % probabilidad de aparicion de monedas
}

window.onload = function() {

    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x0c88c7,
        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
}

// precargar
class preloadGame extends Phaser.Scene{
    constructor(){
        super("PreloadGame");
    }
    preload(){
        this.load.image("platform", "platform.png"); // cargar imagen de plataforma
        this.load.spritesheet('Knight_run','assets/Character Sprites/Knight_1/Knight_1_RunningSwordShieldAnimation.png',{ frameWidth: 16, frameHeight: 32 });// kanig animacion walk
        this.load.spritesheet('Knight_jump','assets/Character Sprites/Knight_1/Knight_1_JumpSwordShieldAnimation.png',{ frameWidth: 32, frameHeight: 32 });// knight animacion jump
        this.load.spritesheet("coin", "coin.png", {frameWidth: 20,frameHeight: 20}); // sprite monedas
        this.load.spritesheet("mountain", "mountain.png", {frameWidth: 512,frameHeight: 512 }); // sprite montañas
        
    }
    create(){
        // conf animacion del jugador
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("Knight_run", {start: 0,end: 6}),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('Knight_jump', { start: 0, end: 5 }),
            frameRate: 8
        });
        // confi anim. moneda
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("coin", {start: 0,end: 5}),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });
        this.scene.start("PlayGame");
    }
}
// escena juego
class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    create(){
        // Grupo con todas las montañas activas 
        this.mountainGroup = this.add.group();
        // grupo de las plataformas activas 
        this.platformGroup = this.add.group({
            //una vez que se quita una plataforma, se agrega al grupo
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });

        // grupo plataformas
        this.platformPool = this.add.group({
            // una vez que se quita una plataforma del grupo, se agrega al grupo de plataformas activas
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });

        // grupo de monedas
        this.coinGroup = this.add.group({
            //una vez que se quita una moneda, se agrega al grupo
            removeCallback: function(coin){
                coin.scene.coinPool.add(coin)
            }
        });

        // pool monedas
        this.coinPool = this.add.group({
            // una vez que se retira una moneda de la reserva, se agrega al grupo de monedas activas
            removeCallback: function(coin){
                coin.scene.coinGroup.add(coin)
            }
        });
        // añadiendo el score text.
        scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
        
        this.addMountains()         // añadiendo montañas

        this.addedPlatforms = 0;    // realizar un seguimiento de las plataformas agregadas
        this.playerJumps = 0;       // número de saltos consecutivos realizados por el jugador hasta el momento

        // agregando una plataforma inicial del juego, los argumentos son el ancho de la plataforma, la posición X,Y
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * OpcionesJuego.LimVerticalPlataforma[1]);

        // añadiendo jugador
        this.player = this.physics.add.sprite(OpcionesJuego.Posicion_Inicio, game.config.height * 0.7, "Knight_run").setScale(2);
        this.player.setGravityY(OpcionesJuego.GravedadJugador);
        this.player.setDepth(3);
        this.player.setCollideWorldBounds(true);

        //AJUSTES DE COLISION ENTRE EL JUGADOR Y EL GRUPO DE PLATAFORMAS 
        this.physics.add.collider(this.player, this.platformGroup, function(){
            // EJECUTAR ANIMACION DE CORRER DEL PERSONAJE SI ESTA TOCANDO UNA PLATAFORMA
            if(!this.player.anims.isPlaying){
                this.player.anims.play("run");
            }
        }, null, this);

        // AJUSTE DE COLISIONES ENTRE EL JUGADOR Y LAS MONEDAS
        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){
            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function(){
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                    score += 10;
                    scoreText.setText('Score: ' + score);
                }

            });
        }, null, this);

        // REVISAR EL METODO DE ENTRADA RATON.
        this.input.on("pointerdown", this.jump, this);
    }

    //AÑADIENDO MONTAÑAS
    addMountains(){
        let rightmostMountain = this.getRightmostMountain();
        if(rightmostMountain < game.config.width * 2){
            let mountain = this.physics.add.sprite(rightmostMountain + Phaser.Math.Between(100, 350), game.config.height + Phaser.Math.Between(0, 100), "mountain");
            mountain.setOrigin(0.5, 1);
            mountain.body.setVelocityX(OpcionesJuego.velocidadMontes * -1)
            this.mountainGroup.add(mountain);
            if(Phaser.Math.Between(0, 1)){
                mountain.setDepth(1);
            }
            mountain.setFrame(Phaser.Math.Between(0, 3))
            this.addMountains()
        }
    }

    // conseguir la posición x de la montaña más a la derecha
    getRightmostMountain(){
        let rightmostMountain = -200;
        this.mountainGroup.getChildren().forEach(function(mountain){
            rightmostMountain = Math.max(rightmostMountain, mountain.x);
        })
        return rightmostMountain;
    }

    // el núcleo del script: la plataforma se agrega desde el grupo o se crea sobre la marcha
    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms ++;
        let platform;
        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            let newRatio =  platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(OpcionesJuego.platformSpeedRange[0], OpcionesJuego.platformSpeedRange[1]) * -1);
            platform.setDepth(2);
            this.platformGroup.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(OpcionesJuego.spawnRange[0], OpcionesJuego.spawnRange[1]);

        // MONEDA SOBRE LA PLATAFORMA?
        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1, 100) <= OpcionesJuego.Porcentaje_monedas){
                if(this.coinPool.getLength()){
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else{
                    let coin = this.physics.add.sprite(posX, posY - 96, "coin");
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play("rotate");
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                }
            }
        }
    }

    // el jugador salta cuando está en el suelo, o una vez en el aire, siempre y cuando queden saltos y el primer salto fue en el suelo
    jump(){
        if(this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < OpcionesJuego.SaltosPermitidos)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(OpcionesJuego.FuerzaDelSalto * -1);
            this.playerJumps ++;

            // DETENER ANIMACION RUN
            this.player.anims.play('jump')
        }
    }

    update(){
        // FIN DEL JUEGO 
        if(this.player.y > game.config.height){
            this.scene.start("PlayGame");
        }
        this.player.x = OpcionesJuego.Posicion_Inicio;
        // RECICLAR PLATAFORMAS
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // monedas recicladas
        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < - coin.displayWidth / 2){
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        // montañas recicladas
        this.mountainGroup.getChildren().forEach(function(mountain){
            if(mountain.x < - mountain.displayWidth){
                let rightmostMountain = this.getRightmostMountain();
                mountain.x = rightmostMountain + Phaser.Math.Between(100, 350);
                mountain.y = game.config.height + Phaser.Math.Between(0, 100);
                mountain.setFrame(Phaser.Math.Between(0, 3))
                if(Phaser.Math.Between(0, 1)){
                    mountain.setDepth(1);
                }
            }
        }, this);

        // añadir plataformas
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(OpcionesJuego.RangoTamPlataforma[0], OpcionesJuego.RangoTamPlataforma[1]);
            let platformRandomHeight = OpcionesJuego.EscalaAlturaPlataforma * Phaser.Math.Between(OpcionesJuego.AlturaEntreNuevaPlataforma[0], OpcionesJuego.AlturaEntreNuevaPlataforma[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * OpcionesJuego.LimVerticalPlataforma[0];
            let maxPlatformHeight = game.config.height * OpcionesJuego.LimVerticalPlataforma[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }
    }
};