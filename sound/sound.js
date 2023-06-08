var gameOver= "gameOver.wav"
var jump= "jump.wav"
var coinSound= "coin.wav"
var muted = true;
function playSoundEffect(sound){
    if(muted !== true){
    var audio = new Audio("./sound/"+sound); // audio file URL
    audio.play();
    }
}