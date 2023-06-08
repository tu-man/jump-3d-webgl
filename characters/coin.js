class Coin extends Character{

    blockNumber=0;
    connectedBlock;
    constructor(){
        super();
    }
    posUpdate(){
        
       
        var x = this.connectedBlock.position.x;
        var y = this.connectedBlock.position.y;
        y += this.connectedBlock.size.height/2+this.size.height/2;
       
        this.objOffset[0]=x;
        this.objOffset[1]=y;

    }
    setRandomBlock(blocks){
        var randomBox  = Math.floor(Math.random() * this.blockNumber);
        if(blocks.length > randomBox)
        this.connectedBlock= blocks[randomBox];
    }
}