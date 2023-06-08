class MainCharacter extends Character{
    constUpDue = 30;
    upDue = this.constUpDue;
    tolerans = 0.1;
    constructor(){
        super();
        this.position.y+=2;
        //this.move(-5,this.yAxis);
    }
    collisionControl(blockList){
        if(this.motion.direction === 1){
            return -1;
        }
        for (let i = 0; i < blockList.length; i++) {
            let obj2 = blockList[i];
    
            if (this.position.y - this.size.height / 2 <=   obj2.position.y + obj2.size.height / 2 + this.tolerans &&
            this.position.y - this.size.height / 2 >=   obj2.position.y + obj2.size.height / 2 - this.tolerans &&
            this.position.x - this.size.width / 2 <= obj2.position.x + obj2.size.width / 2 + this.tolerans &&
            this.position.x + this.size.width / 2 >= obj2.position.x - obj2.size.width / 2 - this.tolerans &&
            this.position.z - this.size.depth / 2 <= obj2.position.z + obj2.size.depth / 2 + this.tolerans &&
            this.position.z + this.size.depth / 2 >= obj2.position.z - obj2.size.depth / 2 - this.tolerans) {
            return i; // çarpışma olan nesnenin indexini döndür
        }
        }
        return -1; // çarpışma yok
    }
    resetPos(){
        this.upDue = this.constUpDue;
        this.motion.direction = 1;
        super.resetPos();
    }
    
    /*collidesWithCoin(coin) {
        var thisSag = (this.position.x + this.size.width/2);
        var thisSol = (this.position.x - this.size.width/2);
        var xControl = (thisSag>=coin.position.x-coin.size.width/2) && (thisSag<=coin.position.x+coin.size.width/2);
        xControl ||= (thisSol>=coin.position.x-coin.size.width/2) && (thisSol<=coin.position.x+coin.size.width/2);

        var thisUst = (this.position.y + this.size.height/2);
        var thisAlt = (this.position.y - this.size.height/2);
        var yControl = (thisUst>=coin.position.y-coin.size.height/2) && (thisUst<=coin.position.y+coin.size.height/2);
        yControl ||= (thisAlt>=coin.position.y-coin.size.height/2) && (thisAlt<=coin.position.y+coin.size.height/2);
        return xControl && yControl;

        
    }
    */
    collidesWithCoin(coin){
        return (
            this.position.x < coin.objOffset[0] + coin.size.width &&
            this.position.x + this.size.width > coin.objOffset[0] &&
            this.position.y < coin.objOffset[1] + coin.size.height &&
            this.position.y + this.size.height > coin.objOffset[1] &&
            this.position.z < coin.objOffset[2] + coin.size.depth &&
            this.position.z + this.size.depth > coin.objOffset[2]
        );
   }


}