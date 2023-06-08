class Ball extends Character{

    status = true;
    upDue = 10;
    upDownSpeed = 0.2;
    rightLeftdirection = 1;
    rightLeftSpeed = 0.3;

    constructor(){
        super();
    }
    autoMove(){
        if(this.upDue>0){
            this.move(this.upDownSpeed,yAxis);
            this.upDue-=1;
        }
        else{
            this.move(-this.upDownSpeed,yAxis);
        }
        this.move(this.rightLeftdirection*this.rightLeftSpeed,xAxis);

    }
    positionControl(){

        // X axis 
        if(this.position.x >= this.posInterval+ this.posIntervalTolarence){
           
            this.move(-this.posDelete,xAxis);
        }
        if(this.position.x <= -this.posInterval - this.posIntervalTolarence){
           
            this.move(this.posDelete,xAxis);
        }

        // Y axis
        if(this.position.y >= this.posInterval + this.posIntervalTolarence){
           
            //this.move(-this.posDelete,yAxis);
            this.status=false;
        }
        if(this.position.y <= -this.posInterval - this.posIntervalTolarence){
           
            this.status=false;
        }

        // Z axis
        if(this.position.z >= this.posInterval){
            
            this.move(-this.posDelete,zAxis);
        }
        
        if(this.position.z <= -this.posInterval){
            
            this.move(this.posDelete,zAxis);
        }
     
    }
    collideControl(monster){
        return (
            this.position.x < monster.objOffset[0] + monster.size.width &&
            this.position.x + this.size.width > monster.objOffset[0] &&
            this.position.y < monster.objOffset[1] + monster.size.height &&
            this.position.y + this.size.height > monster.objOffset[1] &&
            this.position.z < monster.objOffset[2] + monster.size.depth &&
            this.position.z + this.size.depth > monster.objOffset[2]
        );
    }
}