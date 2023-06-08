class Character{
    xAxis = 0;
    yAxis = 1;
    zAxis = 2;
    objOffset = [0,0,0];
    lastHitObject = null;
    size = {
        width:0,
        height:0,
        depth:0
    };
    motion = {
        stat: true,
        axis: 1,
        direction: 1,
        size: 0.2
    };
    posInterval = 16;
    posDelete = this.posInterval *2;
    posIntervalTolarence = 0.6;
    position = {
        x: 0,
        y: 0,
        z: 0
    };
    
   
    constructor() {
        this.parts=[];
    }

    sizeCalculate(range){
        this.size.width = range[0];
        this.size.height = range[1];
        this.size.depth = range[2];
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
        }
        if(this.position.y <= -this.posInterval - this.posIntervalTolarence){
           
            //this.move(this.posDelete,yAxis);
        }

        // Z axis
        if(this.position.z >= this.posInterval){
            
            this.move(-this.posDelete,zAxis);
        }
        
        if(this.position.z <= -this.posInterval){
            
            this.move(this.posDelete,zAxis);
        }
     
    }

    move(len,axis){

        
        this.objOffset[axis] +=len;
        if(axis === this.xAxis){
            this.position.x += len;
        }
        else if(axis === this.yAxis){
            this.position.y += len;
        }
        else{
            this.position.z += len;
        }
        this.positionControl();
        
    }
    autoMove(){
        var len = this.motion.direction * this.motion.size;
        this.move(len,this.motion.axis);
    }

    resetPos(){
        this.move(-this.position.x,this.xAxis);
        this.move(-this.position.y,this.yAxis);
        this.move(-this.position.z,this.zAxis);

    }

}