var gameOver= "gameOver.wav"
var jump= "jump.wav"
var coinSound= "coin.wav"
function playSoundEffect(sound){
    var audio = new Audio("./sound/"+sound); // audio file URL
    audio.play();
}