"use strict";
var canvas;
var gl;
var score = 0;
var coinScore = 100;
var mainCharacter = new MainCharacter();
var coin = new Coin();
var monster = new Monster();
var balls = [];
var refBall = new Ball();
var refBlock = new Block();
var gameStatus =true;
var blockNumber = 16;
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var blocks=[];

var meshProgramInfo;
let isDragging = false;
let u_world = m4.yRotation(0.01);

var zoomSensitivity=3;
var motionSpeed = 0.5;
let rotation = {
  x: 0.06,
  y: 0.03
};
var bufferInfo;

const rotationFactor = 0.03;

// HTML elements
const titleScore = document.querySelector('p.game-overlay-score')
const gameOverScore = document.querySelector('p.game-over-score')
const gameOverScreen = document.querySelector('.game-over-window')
const restartGameButton = document.querySelector('.game-over-button')
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}
function createRandomBlocks(amount,fromUp){
  for(var i=0; i<amount; i++){
  var block = new Block();
 
  block.parts = refBlock.parts;
  block.size = refBlock.size;

  var randomSayi = getRandomArbitrary(-block.posInterval, block.posInterval);
  block.move(randomSayi, xAxis);

  randomSayi = getRandomArbitrary(-block.posInterval, block.posInterval);
  if(fromUp == true){
    randomSayi = getRandomArbitrary(block.posInterval/2, block.posInterval);
  }
  block.move(randomSayi, yAxis);
  if(block.distanceControl(blocks) === false){
      i--;
      continue;
  }
  //randomSayi = getRandomArbitrary(-1, 1);
  //block.move(randomSayi, zAxis);
  if(blocks.length %2 ==0){
    block.slideDirection = 1;
  }
  else{
    block.slideDirection = -1;
  }
  blocks.push(block);
  }

}

function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

function getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }

 
function degToRad(deg) {
    return deg * Math.PI / 180;
  }

var extents;
var range;
// amount to move the object so its center is at the origin

var cameraTarget = [0, 0  , 0];
// figure out how far away to move the camera so we can likely
// see the object.
var radius=87.28791366348406;
var cameraPosition ;
  // Set zNear and zFar to something hopefully appropriate
  // for the size of this object.
var zNear = radius / 100;
var zFar = radius * 3;
async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    canvas = document.querySelector("#canvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      return;
    }
  
    const vs = `
  attribute vec4 a_position;
  attribute vec3 a_normal;
  attribute vec3 a_tangent;
  attribute vec2 a_texcoord;
  attribute vec4 a_color;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform vec3 u_viewWorldPosition;

  varying vec3 v_normal;
  varying vec3 v_tangent;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec4 v_color;

  void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
    mat3 normalMat = mat3(u_world);
    v_normal = normalize(normalMat * a_normal);
    v_tangent = normalize(normalMat * a_tangent);

    v_texcoord = a_texcoord;
    v_color = a_color;
  }
  `;

  const fs = `
  precision highp float;

  varying vec3 v_normal;
  varying vec3 v_tangent;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec4 v_color;

  uniform vec3 diffuse;
  uniform sampler2D diffuseMap;
  uniform vec3 ambient;
  uniform vec3 emissive;
  uniform vec3 specular;
  uniform sampler2D specularMap;
  uniform float shininess;
  uniform sampler2D normalMap;
  uniform float opacity;
  uniform vec3 u_lightDirection;
  uniform vec3 u_ambientLight;

  void main () {
    vec3 normal = normalize(v_normal) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
    vec3 tangent = normalize(v_tangent) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
    vec3 bitangent = normalize(cross(normal, tangent));

    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
    normal = normalize(tbn * normal);

    vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
    vec4 specularMapColor = texture2D(specularMap, v_texcoord);
    vec3 effectiveSpecular = specular * specularMapColor.rgb;

    vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
    vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
    float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

    gl_FragColor = vec4(
        emissive +
        ambient * u_ambientLight +
        effectiveDiffuse * fakeLight +
        effectiveSpecular * pow(specularLight, shininess),
        effectiveOpacity);
  }
  `;
  
  
    // compiles and links the shaders, looks up attribute and uniform locations
    meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
    
    // main character obj import
    var objHref = './obj/main/DoodleJump2.obj';  
    var response = await fetch(objHref);
    var text = await response.text();
    var obj = parseOBJ(text);
    var baseHref = new URL(objHref, window.location.href);
    var matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    var matHref = new URL(filename, baseHref).href;
    var response = await fetch(matHref);
    return await response.text();
  }));
  var materials = parseMTL(matTexts.join('\n'));

  var textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

   var defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

  var parts = obj.geometries.map(({material, data}) => {
    // Because data is just named arrays like this
    //
    // {
    //   position: [...],
    //   texcoord: [...],
    //   normal: [...],
    // }
    //
    // and because those names match the attributes in our vertex
    // shader we can pass it directly into `createBufferInfoFromArrays`
    // from the article "less code more fun".
    for(var i=0;i<data.position.length;i++){
        data.position[i]*=1;
    }
    if (data.color) {
      if (data.position.length === data.color.length) {
        // it's 3. The our helper library assumes 4 so we need
        // to tell it there are only 3.
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      // there are no vertex colors so just use constant white
      data.color = { value: [1, 1, 1, 1] };
    }

    // generate tangents if we have the data to do so.
    if (data.texcoord && data.normal) {
      data.tangent = generateTangents(data.position, data.texcoord);
    } else {
      // There are no tangents
      data.tangent = { value: [1, 0, 0] };
    }

    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }

    if (!data.normal) {
      // we probably want to generate normals if there are none
      data.normal = { value: [0, 0, 1] };
    }

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
    };
  });

    extents= getGeometriesExtents(obj.geometries);
    
    range = m4.subtractVectors(extents.max, extents.min);
    mainCharacter.sizeCalculate(range);
    //radius = m4.length(range)*radius ;
    zNear = radius / 100;
    zFar = radius * 3;
    mainCharacter.parts = parts;

    objHref = './obj/coin2/source/chinese_coin.obj';  
    response = await fetch(objHref);
    text = await response.text();
    obj = parseOBJ(text);
    baseHref = new URL(objHref, window.location.href);
    matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    var matHref = new URL(filename, baseHref).href;
    response = await fetch(matHref);
    return await response.text();
  }));
   materials = parseMTL(matTexts.join('\n'));

   textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

   defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

    parts = obj.geometries.map(({material, data}) => {
        // Because data is just named arrays like this
        //
        // {
        //   position: [...],
        //   texcoord: [...],
        //   normal: [...],
        // }
        //
        // and because those names match the attributes in our vertex
        // shader we can pass it directly into `createBufferInfoFromArrays`
        // from the article "less code more fun".

        for(var i=0;i<data.position.length;i++){
            data.position[i]*=0.1;
        }
        if (data.color) {
        if (data.position.length === data.color.length) {
            // it's 3. The our helper library assumes 4 so we need
            // to tell it there are only 3.
            data.color = { numComponents: 3, data: data.color };
        }
        } else {
        // there are no vertex colors so just use constant white
        data.color = { value: [1, 1, 1, 1] };
        }

        // generate tangents if we have the data to do so.
        if (data.texcoord && data.normal) {
        data.tangent = generateTangents(data.position, data.texcoord);
        } else {
        // There are no tangents
        data.tangent = { value: [1, 0, 0] };
        }

        if (!data.texcoord) {
        data.texcoord = { value: [0, 0] };
        }

        if (!data.normal) {
        // we probably want to generate normals if there are none
        data.normal = { value: [0, 0, 1] };
        }

        // create a buffer for each array by calling
        // gl.createBuffer, gl.bindBuffer, gl.bufferData
        const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
        return {
        material: {
            ...defaultMaterial,
            ...materials[material],
        },
        bufferInfo,
        };
    });
    extents= getGeometriesExtents(obj.geometries);
    
    range = m4.subtractVectors(extents.max, extents.min);
    coin.sizeCalculate(range);
    coin.parts = parts;
    
    coin.setRandomBlock(blocks);
    coin.blockNumber = blockNumber;
    
    // 

    // Creating reference block object
    
    objHref = './obj/kasa/kasa.obj';  
    response = await fetch(objHref);
    text = await response.text();
    obj = parseOBJ(text);
    baseHref = new URL(objHref, window.location.href);
    matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    var matHref = new URL(filename, baseHref).href;
    response = await fetch(matHref);
    return await response.text();
  }));
   materials = parseMTL(matTexts.join('\n'));

   textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

   defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

    parts = obj.geometries.map(({material, data}) => {
        // Because data is just named arrays like this
        //
        // {
        //   position: [...],
        //   texcoord: [...],
        //   normal: [...],
        // }
        //
        // and because those names match the attributes in our vertex
        // shader we can pass it directly into `createBufferInfoFromArrays`
        // from the article "less code more fun".
        for(var i=0;i<data.position.length;i++){
            data.position[i]*=1.2;
        }
        if (data.color) {
        if (data.position.length === data.color.length) {
            // it's 3. The our helper library assumes 4 so we need
            // to tell it there are only 3.
            data.color = { numComponents: 3, data: data.color };
        }
        } else {
        // there are no vertex colors so just use constant white
        data.color = { value: [1, 1, 1, 1] };
        }

        // generate tangents if we have the data to do so.
        if (data.texcoord && data.normal) {
        data.tangent = generateTangents(data.position, data.texcoord);
        } else {
        // There are no tangents
        data.tangent = { value: [1, 0, 0] };
        }

        if (!data.texcoord) {
        data.texcoord = { value: [0, 0] };
        }

        if (!data.normal) {
        // we probably want to generate normals if there are none
        data.normal = { value: [0, 0, 1] };
        }

        // create a buffer for each array by calling
        // gl.createBuffer, gl.bindBuffer, gl.bufferData
        const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
        return {
        material: {
            ...defaultMaterial,
            ...materials[material],
        },
        bufferInfo,
        };
    });
    extents= getGeometriesExtents(obj.geometries);
    
    
    refBlock.parts = parts;
    extents= getGeometriesExtents(obj.geometries);
    range = m4.subtractVectors(extents.max, extents.min);
    refBlock.sizeCalculate(range);


    // creating monster 
    objHref = './obj/monster/obj.obj';  
    response = await fetch(objHref);
    text = await response.text();
    obj = parseOBJ(text);
    baseHref = new URL(objHref, window.location.href);
    matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    var matHref = new URL(filename, baseHref).href;
    response = await fetch(matHref);
    return await response.text();
  }));
   materials = parseMTL(matTexts.join('\n'));

   textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

   defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

    parts = obj.geometries.map(({material, data}) => {
        // Because data is just named arrays like this
        //
        // {
        //   position: [...],
        //   texcoord: [...],
        //   normal: [...],
        // }
        //
        // and because those names match the attributes in our vertex
        // shader we can pass it directly into `createBufferInfoFromArrays`
        // from the article "less code more fun".

        for(var i=0;i<data.position.length;i++){
            data.position[i]*=1;
        }
        if (data.color) {
        if (data.position.length === data.color.length) {
            // it's 3. The our helper library assumes 4 so we need
            // to tell it there are only 3.
            data.color = { numComponents: 3, data: data.color };
        }
        } else {
        // there are no vertex colors so just use constant white
        data.color = { value: [1, 1, 1, 1] };
        }

        // generate tangents if we have the data to do so.
        if (data.texcoord && data.normal) {
        data.tangent = generateTangents(data.position, data.texcoord);
        } else {
        // There are no tangents
        data.tangent = { value: [1, 0, 0] };
        }

        if (!data.texcoord) {
        data.texcoord = { value: [0, 0] };
        }

        if (!data.normal) {
        // we probably want to generate normals if there are none
        data.normal = { value: [0, 0, 1] };
        }

        // create a buffer for each array by calling
        // gl.createBuffer, gl.bindBuffer, gl.bufferData
        const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
        return {
        material: {
            ...defaultMaterial,
            ...materials[material],
        },
        bufferInfo,
        };
    });
    extents= getGeometriesExtents(obj.geometries);
    
    range = m4.subtractVectors(extents.max, extents.min);
    monster.sizeCalculate(range);
    monster.parts = parts;
    monster.setRandomBlock(blocks);
    monster.blockNumber = blockNumber;
    

     // Creating reference ball object
    
     objHref = './obj/ball/POKE BALL.obj';  
     response = await fetch(objHref);
     text = await response.text();
     obj = parseOBJ(text);
     baseHref = new URL(objHref, window.location.href);
     matTexts = await Promise.all(obj.materialLibs.map(async filename => {
     var matHref = new URL(filename, baseHref).href;
     response = await fetch(matHref);
     return await response.text();
   }));
    materials = parseMTL(matTexts.join('\n'));
 
    textures = {
     defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
     defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
   };
 
   // load texture for materials
   for (const material of Object.values(materials)) {
     Object.entries(material)
       .filter(([key]) => key.endsWith('Map'))
       .forEach(([key, filename]) => {
         let texture = textures[filename];
         if (!texture) {
           const textureHref = new URL(filename, baseHref).href;
           texture = createTexture(gl, textureHref);
           textures[filename] = texture;
         }
         material[key] = texture;
       });
   }
 
   // hack the materials so we can see the specular map
   Object.values(materials).forEach(m => {
     m.shininess = 25;
     m.specular = [3, 2, 1];
   });
 
    defaultMaterial = {
     diffuse: [1, 1, 1],
     diffuseMap: textures.defaultWhite,
     normalMap: textures.defaultNormal,
     ambient: [0, 0, 0],
     specular: [1, 1, 1],
     specularMap: textures.defaultWhite,
     shininess: 400,
     opacity: 1,
   };
 
     parts = obj.geometries.map(({material, data}) => {
         // Because data is just named arrays like this
         //
         // {
         //   position: [...],
         //   texcoord: [...],
         //   normal: [...],
         // }
         //
         // and because those names match the attributes in our vertex
         // shader we can pass it directly into `createBufferInfoFromArrays`
         // from the article "less code more fun".
         for(var i=0;i<data.position.length;i++){
             data.position[i]*=0.8;
         }
         if (data.color) {
         if (data.position.length === data.color.length) {
             // it's 3. The our helper library assumes 4 so we need
             // to tell it there are only 3.
             data.color = { numComponents: 3, data: data.color };
         }
         } else {
         // there are no vertex colors so just use constant white
         data.color = { value: [1, 1, 1, 1] };
         }
 
         // generate tangents if we have the data to do so.
         if (data.texcoord && data.normal) {
         data.tangent = generateTangents(data.position, data.texcoord);
         } else {
         // There are no tangents
         data.tangent = { value: [1, 0, 0] };
         }
 
         if (!data.texcoord) {
         data.texcoord = { value: [0, 0] };
         }
 
         if (!data.normal) {
         // we probably want to generate normals if there are none
         data.normal = { value: [0, 0, 1] };
         }
 
         // create a buffer for each array by calling
         // gl.createBuffer, gl.bindBuffer, gl.bufferData
         const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
         return {
         material: {
             ...defaultMaterial,
             ...materials[material],
         },
         bufferInfo,
         };
     });
     extents= getGeometriesExtents(obj.geometries);
     
     
     refBall.parts = parts;
     extents= getGeometriesExtents(obj.geometries);
     range = m4.subtractVectors(extents.max, extents.min);
     refBall.sizeCalculate(range);
 
    cameraPosition = m4.addVectors(cameraTarget, [
        0,
        0,
        radius,
      ]);        
      document.addEventListener('mousedown', function(e) {
        if (e.button !== 2) { // sağ tuş kontrolü
            ballCreate();
            return;
        }
        isDragging = true;
        
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) {
            return;
        }
    
        const deltaX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const deltaY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
    
        rotation.y += deltaX * rotationFactor;
        rotation.x += deltaY * rotationFactor;

        //u_world = m4.yRotation(rotation.x);
        //u_world = m4.xRotation(rotation.y);
       
        
    });
    
    document.addEventListener('mouseup', function(e) {
        if (e.button !== 2) {
            ballCreate();
            return;
        }
        isDragging = false;
    });
    
    // Sağ tıklama menüsünün açılmasını engellemek için
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    document.addEventListener('wheel', function(e) {
      // "e.deltaY" değeri, tekerleğin yukarı mı aşağı mı döndüğünü belirtir
      // Yukarı döndüğünde bu değer negatif, aşağı döndüğünde pozitiftir.
      
      if (e.deltaY < 0)
          radius += zoomSensitivity; // Yakınlaştırma
      else
      radius += -1*zoomSensitivity; // Uzaklaştırma
  
      //zoomLevel = Math.min(Math.max(.1, zoomLevel), 1.9); // zoom seviyesini bir aralıkta sınırla
  
      
     
  }, false);
  
      document.addEventListener('keypress', function(event) {
          if(event.key === 'a' ||event.key === 'A' ) {
              mainCharacter.move(-parseFloat(motionSpeed.toFixed(2)),xAxis)
              mainCharacter.ballDirection = -1;
              
          }
          if(event.key === 'd' ||event.key === 'D' ) {
              mainCharacter.move(parseFloat(motionSpeed.toFixed(2)),xAxis)
              mainCharacter.ballDirection = 1;
          }

          if(event.key === 'w' ||event.key === 'W' ) {
              mainCharacter.move(parseFloat(motionSpeed.toFixed(2)),zAxis)
          }
          if(event.key === 's' ||event.key === 'S' ) {
              mainCharacter.move(-parseFloat(motionSpeed.toFixed(2)),zAxis)
          }
          if(event.key === ' ' ) {
              mainCharacter.resetPos();
              gameStatus = true;
          }
         
      });

      document.querySelector('#soundButton').addEventListener('click', function() {
        if (muted) {
          muted = false;
          this.textContent = "Sesi Kapat";
        } else {
          muted = true;
          this.textContent = "Sesi Aç";
        }
      });
      
      
      restartGameButton.addEventListener('click', restartGame)
      
    createRandomBlocks(blockNumber);
    requestAnimationFrame(render);
  }
  
  
  function drawObject(object,xRotation,yRotation){

  
    u_world=  m4.multiply(m4.xRotation(xRotation), m4.yRotation(yRotation));
    
    u_world = m4.translate(u_world, ...object.objOffset);
    
    for (const {bufferInfo, material} of object.parts) {
        // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
        webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
        // calls gl.uniform
        webglUtils.setUniforms(meshProgramInfo, {
          u_world,
        }, material);
        // calls gl.drawArrays or gl.drawElements
        webglUtils.drawBufferInfo(gl, bufferInfo);
      }

  
  }
  function slideBlocks(){
    for(var i=0; i<blocks.length;i++){
        blocks[i].slide();
        
    }
  }
  function moveDownEnvironment(){
   
    for(var i=0; i<blocks.length;i++){
        blocks[i].autoMove();
        if(blocks[i].status===false){
            var blk = blocks[i];
            
            blocks.splice(i,1);
            createRandomBlocks(1,true);
            if(blk === coin.connectedBlock){
                coin.setRandomBlock(blocks);
            }
            if(blk === monster.connectedBlock){
              monster.setRandomBlock(blocks);
          }
        }
    }
}
function ballCreate(){
  if(balls.length > 4){
    return;
  }
  var ball = new Ball();
  ball.parts = refBall.parts;
  ball.size = refBall.size;
  ball.rightLeftdirection = mainCharacter.ballDirection;
  ball.move(mainCharacter.position.x+mainCharacter.ballDirection,xAxis);
  ball.move(mainCharacter.position.y+1,yAxis);
  balls.push(ball);
}
  function render(time) {
    if(coin.connectedBlock == null){
        coin.setRandomBlock(blocks);
    }
    if(monster.connectedBlock == null){
      monster.setRandomBlock(blocks);
  }
    if(gameStatus === true){
    time *= 0.001;  // convert to seconds

    slideBlocks();
    if(mainCharacter.upDue > 0){
        mainCharacter.autoMove();
        mainCharacter.upDue -= 1 ;
        if(mainCharacter.upDue <= 0){
            mainCharacter.upDue = 0;
            mainCharacter.motion.direction = -1;
        }
    }
    else{
        mainCharacter.autoMove();
    }
    if(mainCharacter.position.y <= -16.2){
        gameStatus = false;
        playSoundEffect(gameOver);
    }

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    zNear = radius / 100;
    zFar = radius * 3;
    cameraPosition = m4.addVectors(cameraTarget, [
        0,
        0,
        radius,
      ]);     
    const fieldOfViewRadians = degToRad(20);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    const sharedUniforms = {
        u_lightDirection: m4.normalize([-1, 3, 5]),
        u_view: view,
        u_projection: projection,
        u_viewWorldPosition: cameraPosition,
      };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    // compute the world matrix once since all parts
    // are at the same space.
    // u_world = m4.yRotation(time);
    
    //blocks[0].autoMove();
    var len = balls.length;
    for(var i =0;i<len;i++){
      
      if(balls[i].status===false){
        balls.splice(i,1);
        i-=1;
        len-=1;
        continue;
      }
      balls[i].autoMove();
    }

    for(var i=0;i<balls.length;i++){
      drawObject(balls[i],rotation.x,rotation.y);
    }
    drawObject(mainCharacter,rotation.x,rotation.y);
    
    for(var i=0;i<blocks.length;i++){
      drawObject(blocks[i],rotation.x,rotation.y);
    }

   

    var collisionControl = mainCharacter.collisionControl(blocks);
    if(collisionControl !== -1){
        playSoundEffect(jump);
        if(mainCharacter.lastHitObject != blocks[collisionControl]){
            
            moveDownEnvironment();
            mainCharacter.lastHitObject = blocks[collisionControl];
        }
        mainCharacter.upDue = mainCharacter.constUpDue;
        mainCharacter.motion.direction = 1;
    }

    
    coin.posUpdate();
    drawObject(coin,rotation.x,rotation.y);
    
    monster.posUpdate();
    drawObject(monster,rotation.x,rotation.y);

    if(mainCharacter.collidesWithCoin(coin) === true){
       incScore();  
        playSoundEffect(coinSound);
        coin.setRandomBlock(blocks);
    }

    if(mainCharacter.collidesWithCoin(monster) === true){
      
      playSoundEffect(gameOver);
      gameStatus=false;
  }
  for(var i=0;i<balls.length;i++){
    if(balls[i].collideControl(monster) === true){
      monster.setRandomBlock(blocks);
      incScore();
      playSoundEffect(coinSound); //TODO Change sound
    }
  }
  
  

  
    

    
  }
  else {
		showGameOverScreen()
	}
  requestAnimationFrame(render);

}
function incScore() {
	score += coinScore
	updateScoreFields()
}
function updateScoreFields() {
	titleScore.dataset.score = score
	gameOverScore.dataset.score = score
}

function showGameOverScreen() {
	gameOverScreen.style.display = 'block'
}
function restartGame() {
	mainCharacter.resetPos()
	rotation = { x: 0, y: 0 }
	score = 0
	updateScoreFields()

	gameOverScreen.style.display = 'none'
	gameStatus = true
  
}
