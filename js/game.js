var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {  // definimos las fisicas
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
// definicion de variables 
var game = new Phaser.Game(config)
var platforms;
var player;
var stars;
var score = 0;
var scoreText;
var bombs;

function collectStar (player, star)
{
    star.disableBody(true, true);
    // aumentar la puntuacion y la puntuacion en pantalla 
    score += 10;
    scoreText.setText('Score: ' + score);
    if (stars.countActive(true) === 0) // countActive retorna cuantas estrellas quedan 
    {
        stars.children.iterate(function (child) 
        {
            child.enableBody(true, child.x, 0, true, true); // las volvemos a activar  y resteamos su valor de y en 0 para que caigan otra vez
        });
        //      cordenada x aleatoria 
        var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        var bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1); // añadiendole rebote
        bomb.setCollideWorldBounds(true); // no puede salir del mundo
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20); // velocidad aleatoria

    }
}

function hitBomb (player, bomb)
{
    this.physics.pause(); 
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
}
function preload ()
{
    // Precarga las cosas
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude','assets/dude.png',{ frameWidth: 32, frameHeight: 48 });

}

function create ()
{
    //estatico
    this.add.image(400, 300, 'sky');
    // this.add.image(Math.random() * 800 , Math.random() * 600 , 'star')

     // Esta línea crea el objeto 'cursors' con cuatro propiedades: up, down, left, right.
    cursors = this.input.keyboard.createCursorKeys();


    platforms = this.physics.add.staticGroup(); // creando un grupo de plataformas
    // Añadiendo plataformas al mapa
    platforms.create(400, 568, 'ground').setScale(2).refreshBody(); // piso escalamos x2 (setscale(2))
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // Añadiendo al jugador.
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2); // se le agrega rebote de 0.2 al personaje
    player.setCollideWorldBounds(true); // colisionar con bordes del juego , verdadero
    player.body.setGravityY(300);

    // Animaciones del personaje
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10, // 10 frames por segundo
        repeat: -1 // para que vuelva a empezar cuando termine
    });
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1 
    });
    
    stars = this.physics.add.group({ // Creando grupo de estrellas, con su configuracion de fisica propia
        key: 'star', // llave
        repeat: 11, // repeticion 
        setXY: { x: 12, y: 0, stepX: 70 } // incremento en x de 70 para aparicion
    })
    stars.children.iterate(function (child) {
    child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8)); // añada un efecto de rebote solo al grupo de estrellas
                                                           // rebote entre 0.4 y 0.8
    });

    // Creando el objeto texto par ala puntuacion.
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
    
    // creando grupo bombas
    bombs = this.physics.add.group();
}

function update ()
{
    //se actualiza en busca de cambios
    this.physics.add.collider(player, platforms); // collider entre el personaje y el grupo de objetos platforms
    this.physics.add.collider(stars, platforms); // collider entre las estrellas y la plataforma
    // revisar si colisiona el jugador con una estrella, si es asi se ejecuta la funcion 'collectstar' pasandole los dos objetos implicados
    this.physics.add.overlap(player, stars, collectStar, null, this) 

    // capturando eventos del teclado
    if (cursors.left.isDown){// si se preciona la tecla left
        player.setVelocityX(-160); // se aplica una velocidad negativa  
        player.anims.play('left',true); // se ejecuta la animacion left
    }
    else if (cursors.right.isDown){
        player.setVelocityX(160);
        player.anims.play('right', true);
    }
    else{
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    if(cursors.up.isDown && player.body.touching.down){
    player.setVelocityY(-500); // valor del salto
    }

    // colider de la bomba
    this.physics.add.collider(bombs, platforms); // bomba y plataforma
    this.physics.add.collider(player, bombs, hitBomb, null, this); // bomba y jugador, llama a la funcion hitbomb
} 