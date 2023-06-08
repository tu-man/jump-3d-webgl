class Block extends Character{
    necessaryDistance = 1.2;
    status = true;
    slideSpeed = 0.02;
    slideDirection = 1;
    constructor() {
        super();
        this.motion.direction = -1;
        this.motion.size = 3;
       
    }
    distanceControl(blockList){
        if(blockList.length === 0){
            return true;
        }
        var lenX = 0;
        var lenY = 0;
        var lenMinX = 999;
        var lenMinY = 999;
        for(var i=0; i<blockList.length; i++){
            lenX = Math.abs(blockList[i].position.x - this.position.x)
            
            lenY = Math.abs(blockList[i].position.y - this.position.y)

            if(lenX < lenMinX){
                lenMinX = lenX;
            }
            if(lenY < lenMinY){
                lenMinY= lenY;
            }
        }
        
        if(lenMinX < this.necessaryDistance){
          
            return false;
        }
        
        if(lenMinY < this.necessaryDistance){
          
            return false;
        }
        return true;
    }
    positionControl(){

        // X axis 
        if(this.position.x >= this.posInterval){
           
            this.move(-this.posDelete,xAxis);
        }
        if(this.position.x <= -this.posInterval){
           
            this.move(this.posDelete,xAxis);
        }

        // Y axis
        if(this.position.y >= this.posInterval){
           
            //this.move(-this.posDelete,yAxis);
        }
        if(this.position.y <= -this.posInterval){
           
            this.status = false;
        }

        // Z axis
        if(this.position.z >= this.posInterval){
            
            this.move(-this.posDelete,zAxis);
        }
        
        if(this.position.z <= -this.posInterval){
            
            this.move(this.posDelete,zAxis);
        }
     
    }

    slide(){
        if(this.slideDirection === 1){
            if(this.position.x+this.slideSpeed< this.posInterval){
                this.move(this.slideSpeed,this.xAxis);
            }
            else{
                this.slideDirection = -1;
            }
        }
        else{
            if(this.position.x - this.slideSpeed> -this.posInterval){
                this.move(-this.slideSpeed,this.xAxis);
            }
            else{
                this.slideDirection = 1;
            }

        }
        
    }

}