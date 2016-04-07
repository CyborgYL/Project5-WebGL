	
var message = document.getElementById("message");
var canvas = document.getElementById("canvas");
window.addEventListener("resize", function(){
	var canvasRatio = canvas.height / canvas.width;
	canvas.style.width = window.innerWidth + 'px';
	canvas.style.height = window.innerWidth * canvasRatio + 'px';
});
	
(function() {
    "use strict";
    /*global window,document,Float32Array,Uint16Array,mat4,vec3,snoise*/
    /*global getShaderSource,createWebGLContext,createProgram*/

    function sphericalToCartesian( r, a, e ) {
        var x = r * Math.cos(e) * Math.cos(a);
        var y = r * Math.sin(e);
        var z = r * Math.cos(e) * Math.sin(a);

        return [x,y,z];
    }
    var FPS = 0;
    var ticks = 0;
    var lastFPS = 0;

    var NUM_WIDTH_PTS = 64;
    var NUM_HEIGHT_PTS = 64;


	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	
    var gl = createWebGLContext(canvas, message);
    if (!gl) {
        return;
    }

    ///////////////////////////////////////////////////////////////////////////

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var persp = mat4.create();
    mat4.perspective(45.0, canvas.width/canvas.height, 0.1, 100.0, persp);

    var radius = 5.0;
    var azimuth = Math.PI;
    var elevation = 0.0001;

    var eye = sphericalToCartesian(radius, azimuth, elevation);
    var center = [0.0, 0.0, 0.0];
    var up = [0.0, 1.0, 0.0];
    var view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    var positionLocation;
    var normalLocation;
    var texCoordLocation;
    var u_InvTransLocation;
    var u_ModelLocation;
    var u_ViewLocation;
    var u_PerspLocation;
    var u_CameraSpaceDirLightLocation;
    var u_DayDiffuseLocation;
    var u_NightLocation;
    var u_CloudLocation;
    var u_CloudTransLocation;
    var u_EarthSpecLocation;
    var u_BumpLocation;
    var u_timeLocation;
    var u_waterSpecLocation;
    var u_waterBumpLocation;

    var u_skyboxLocation = new Array();
    //var u_skyboxInvTransLocation;
    var u_skyboxModelLocation;
    var u_skyboxViewLocation;
    var u_skyboxPerspLocation;
    var skyboxPosLocation;

    var program;
    var skyboxProgram;
    (function initializeShader() {
        //render the earth
        var vs = getShaderSource(document.getElementById("vs"));
        var fs = getShaderSource(document.getElementById("fs"));

        program = createProgram(gl, vs, fs, message);
        positionLocation = gl.getAttribLocation(program, "Position");
        normalLocation = gl.getAttribLocation(program, "Normal");
        texCoordLocation = gl.getAttribLocation(program, "Texcoord");
        u_ModelLocation = gl.getUniformLocation(program,"u_Model");
        u_ViewLocation = gl.getUniformLocation(program,"u_View");
        u_PerspLocation = gl.getUniformLocation(program,"u_Persp");
        u_InvTransLocation = gl.getUniformLocation(program,"u_InvTrans");
        u_DayDiffuseLocation = gl.getUniformLocation(program,"u_DayDiffuse");
        u_NightLocation = gl.getUniformLocation(program,"u_Night");
        u_CloudLocation = gl.getUniformLocation(program,"u_Cloud");
        u_CloudTransLocation = gl.getUniformLocation(program,"u_CloudTrans");
        u_EarthSpecLocation = gl.getUniformLocation(program,"u_EarthSpec");
        u_BumpLocation = gl.getUniformLocation(program,"u_Bump");
        u_timeLocation = gl.getUniformLocation(program,"u_time");
        u_CameraSpaceDirLightLocation = gl.getUniformLocation(program,"u_CameraSpaceDirLight");
        u_waterSpecLocation = gl.getUniformLocation(program, "u_waterSpec");
        u_waterBumpLocation = gl.getUniformLocation(program, "u_waterBump");

        //render skybox
        vs = getShaderSource(document.getElementById("skyboxvs"));
        fs = getShaderSource(document.getElementById("skyboxfs"));

        skyboxProgram = createProgram(gl, vs, fs, message);
        u_skyboxLocation[0] = gl.getUniformLocation(skyboxProgram, "u_Skybox");
        skyboxPosLocation = gl.getAttribLocation(skyboxProgram, "Position");
        u_skyboxModelLocation = gl.getUniformLocation(skyboxProgram, "u_Model");
        u_skyboxViewLocation = gl.getUniformLocation(skyboxProgram, "u_View");
        u_skyboxPerspLocation = gl.getUniformLocation(skyboxProgram, "u_Persp");
        //u_skyboxInvTransLocation = gl.getUniformLocation(skyboxProgram, "u_InvTrans");

    })();

    var dayTex   = gl.createTexture();
    var bumpTex  = gl.createTexture();
    var cloudTex = gl.createTexture();
    var transTex = gl.createTexture();
    var lightTex = gl.createTexture();
    var specTex = gl.createTexture();
    var waterSpec = gl.createTexture();
    var waterBump = gl.createTexture();

    var skyboxTex = gl.createTexture();
    var skyboxFaces = new Array();

    function initLoadedTexture(texture){
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    //function initLoadedCubeMapTexture(texture, face, image) {
    //    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    //    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT);
    //    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);
    //    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    //    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    //    gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    //    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    //}
    // cube vectices and index matrix from http://en.wikibooks.org/wiki/OpenGL_Programming/Modern_OpenGL_Tutorial_06
    var cubePositionBuffer;
    var cubeIndexBuffer;
    (function initailzeCube() {
        cubePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionBuffer);
        var vertices = [
            // Front face
            -1.0, -1.0, 1.0,
             1.0, -1.0, 1.0,
             1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
             1.0, 1.0, -1.0,
             1.0, -1.0, -1.0,

            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
             1.0, 1.0, 1.0,
             1.0, 1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            // Right face
             1.0, -1.0, -1.0,
             1.0, 1.0, -1.0,
             1.0, 1.0, 1.0,
             1.0, -1.0, 1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        cubePositionBuffer.itemSize = 3;
        cubePositionBuffer.numItems = 24;


        cubeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
        var cubeVertexIndices = [
            0, 1, 2, 0, 2, 3,    // Front face
            4, 5, 6, 4, 6, 7,    // Back face
            8, 9, 10, 8, 10, 11,  // Top face
            12, 13, 14, 12, 14, 15, // Bottom face
            16, 17, 18, 16, 18, 19, // Right face
            20, 21, 22, 20, 22, 23  // Left face
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        cubeIndexBuffer.itemSize = 1;
        cubeIndexBuffer.numItems = 36;
    }
    )();

    var numberOfIndices;
    var positionsName;
    var normalsName;
    var texCoordsName;
    var indicesName;
    (function initializeSphere() {
        function uploadMesh(positions, texCoords, indices) {
            // Positions
            positionsName = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionsName);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);
            
            // Normals
            normalsName = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalsName);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(normalLocation);
            
            // TextureCoords
            texCoordsName = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsName);
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(texCoordLocation);

            // Indices
            indicesName = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesName);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }

        var WIDTH_DIVISIONS = NUM_WIDTH_PTS - 1;
        var HEIGHT_DIVISIONS = NUM_HEIGHT_PTS - 1;

        var numberOfPositions = NUM_WIDTH_PTS * NUM_HEIGHT_PTS;

        var positions = new Float32Array(3 * numberOfPositions);
        var texCoords = new Float32Array(2 * numberOfPositions);
        var indices = new Uint16Array(6 * (WIDTH_DIVISIONS * HEIGHT_DIVISIONS));

        var positionsIndex = 0;
        var texCoordsIndex = 0;
        var indicesIndex = 0;
        var length;

        for( var j = 0; j < NUM_HEIGHT_PTS; ++j )
        {
            var inclination = Math.PI * (j / HEIGHT_DIVISIONS);
            for( var i = 0; i < NUM_WIDTH_PTS; ++i )
            {
                var azimuth = 2 * Math.PI * (i / WIDTH_DIVISIONS);
                positions[positionsIndex++] = Math.sin(inclination)*Math.cos(azimuth);
                positions[positionsIndex++] = Math.cos(inclination);
                positions[positionsIndex++] = Math.sin(inclination)*Math.sin(azimuth);
                texCoords[texCoordsIndex++] = i / WIDTH_DIVISIONS;
                texCoords[texCoordsIndex++] = j / HEIGHT_DIVISIONS;
            } 
        }

        for( var j = 0; j < HEIGHT_DIVISIONS; ++j )
        {
            var index = j*NUM_WIDTH_PTS;
            for( var i = 0; i < WIDTH_DIVISIONS; ++i )
            {
                    indices[indicesIndex++] = index + i;
                    indices[indicesIndex++] = index + i+1;
                    indices[indicesIndex++] = index + i+NUM_WIDTH_PTS;
                    indices[indicesIndex++] = index + i+NUM_WIDTH_PTS;
                    indices[indicesIndex++] = index + i+1;
                    indices[indicesIndex++] = index + i+NUM_WIDTH_PTS+1;
            }
        }

        uploadMesh(positions, texCoords, indices);
        numberOfIndices = indicesIndex;
    })();

    var time = 0;
    var mouseLeftDown = false;
    var mouseRightDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    function handleMouseDown(event) {
        if( event.button == 2 ) {
            mouseLeftDown = false;
            mouseRightDown = true;
        }
        else {
            mouseLeftDown = true;
            mouseRightDown = false;
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event) {
        mouseLeftDown = false;
        mouseRightDown = false;
    }

    function handleMouseMove(event) {
        if (!(mouseLeftDown || mouseRightDown)) {
            return;
        }
        var newX = event.clientX;
        var newY = event.clientY;

        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;
        
        if( mouseLeftDown )
        {
            azimuth += 0.01 * deltaX;
            elevation += 0.01 * deltaY;
            elevation = Math.min(Math.max(elevation, -Math.PI/2+0.001), Math.PI/2-0.001);
        }
        else
        {
            radius += 0.01 * deltaY;
            radius = Math.min(Math.max(radius, 2.0), 10.0);
        }
        eye = sphericalToCartesian(radius, azimuth, elevation);
        view = mat4.create();
        mat4.lookAt(eye, center, up, view);

        lastMouseX = newX;
        lastMouseY = newY;
    }

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function(ev) {return false;};
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;


    function animate() {
        ///////////////////////////////////////////////////////////////////////////
        // Update
		
	
        var model = mat4.create();
        mat4.identity(model);
        mat4.rotate(model, 23.4 / 180 * Math.PI, [0.0, 0.0, 1.0]);
        mat4.rotate(model, Math.PI, [1.0, 0.0, 0.0]);
        mat4.rotate(model, -time, [0.0, 1.0, 0.0]);
        var mv = mat4.create();
        mat4.multiply(view, model, mv);

        var invTrans = mat4.create();
        mat4.inverse(mv, invTrans);
        mat4.transpose(invTrans);

        var lightdir = vec3.create([1.0, 0.0, 1.0]);
        var lightdest = vec4.create();
        vec3.normalize(lightdir);
        mat4.multiplyVec4(view, [lightdir[0], lightdir[1], lightdir[2], 0.0], lightdest);
        lightdir = vec3.createFrom(lightdest[0], lightdest[1], lightdest[2]);
        vec3.normalize(lightdir);

        //Render skybox
        //var skyModel = mat4.create();
        //mat4.identity(skyModel);
        //var skyMV = mat4.create();
        //mat4.multiply(view, skyModel, skyMV);

        //mat4.scale(skyModel, vec3.create([50.0, 50.0, 50.0]));
        //mat4.multiply(view, skyModel, skyMV);

        //invTrans = mat4.create();
        //mat4.inverse(mv, invTrans);
        //mat4.transpose(invTrans);

        //gl.useProgram(skyboxProgram);
        //gl.enableVertexAttribArray(skyboxPosLocation);


        //gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionBuffer);
        //gl.vertexAttribPointer(skyboxPosLocation, cubePositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

        //gl.uniformMatrix4fv(u_skyboxModelLocation, false, skyModel);
        //gl.uniformMatrix4fv(u_skyboxViewLocation, false, view);
        //gl.uniformMatrix4fv(u_skyboxPerspLocation, false, persp);
        ////gl.uniformMatrix4fv(u_skyboxInvTransLocation, false, invTrans);

        //gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
        //gl.uniform1i(u_skyboxLocation[0], 0);

        //gl.drawElements(gl.TRIANGLES, cubeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

        //gl.disableVertexAttribArray(skyboxPosLocation);

        ///////////////////////////////////////////////////////////////////////////
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        ///////////////////////////////////
        // Render the earth
        gl.useProgram(program);
        gl.enableVertexAttribArray(positionLocation);
        gl.enableVertexAttribArray(normalLocation);
        gl.enableVertexAttribArray(texCoordLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionsName);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalsName);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsName);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesName);

        gl.uniformMatrix4fv(u_ModelLocation, false, model);
        gl.uniformMatrix4fv(u_ViewLocation, false, view);
        gl.uniformMatrix4fv(u_PerspLocation, false, persp);
        gl.uniformMatrix4fv(u_InvTransLocation, false, invTrans);
        
        gl.uniform3fv(u_CameraSpaceDirLightLocation, lightdir);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dayTex);
        gl.uniform1i(u_DayDiffuseLocation, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, bumpTex);
        gl.uniform1i(u_BumpLocation, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, cloudTex);
        gl.uniform1i(u_CloudLocation, 2);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, transTex);
        gl.uniform1i(u_CloudTransLocation, 3);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, lightTex);
        gl.uniform1i(u_NightLocation, 4);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, specTex);
        gl.uniform1i(u_EarthSpecLocation, 5);
        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, waterSpec);
        gl.uniform1i(u_waterSpecLocation, 6)
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, waterBump);
        gl.uniform1i(u_waterBumpLocation, 7);
        
        gl.drawElements(gl.TRIANGLES, numberOfIndices, gl.UNSIGNED_SHORT,0);

        gl.disableVertexAttribArray(positionLocation);
        gl.disableVertexAttribArray(normalLocation);
        gl.disableVertexAttribArray(texCoordLocation);
        //Render skybox
        //scale the box first
        mat4.scale(model, vec3.create([50.0, 50.0, 50.0]));
        mat4.multiply(view, model, mv);

        invTrans = mat4.create();
        mat4.inverse(mv, invTrans);
        mat4.transpose(invTrans);

        gl.useProgram(skyboxProgram);
        gl.enableVertexAttribArray(skyboxPosLocation);


        gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionBuffer);
        gl.vertexAttribPointer(skyboxPosLocation, cubePositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

        gl.uniformMatrix4fv(u_skyboxModelLocation, false, model);
        gl.uniformMatrix4fv(u_skyboxViewLocation, false, view);
        gl.uniformMatrix4fv(u_skyboxPerspLocation, false, persp);
        //gl.uniformMatrix4fv(u_skyInvTransLocation, false, invTrans);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
        gl.uniform1i(u_skyboxLocation[0], 0);

        gl.drawElements(gl.TRIANGLES, cubeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(skyboxPosLocation);

        gl.useProgram(program);
        time += 0.001;
        gl.uniform1f(u_timeLocation, time);
        window.requestAnimFrame(animate);
        var now = Date.now();
        if (now - lastFPS >= 1000) {
            lastFPS = now;
            FPS = ticks;
            ticks = 0;
            document.getElementById("FPS").innerHTML = 'FPS=' + FPS;
        }
        ticks++;
    };
	
	
    var textureCount = 0;
        
    function initializeTexture(texture, src) {
        texture.image = new Image();
        texture.image.onload = function() {
            initLoadedTexture(texture);

            // Animate once textures load.
            if (++textureCount === 6) {
				//resize();
                animate();
            }
        }
        texture.image.src = src;
    };

    initializeTexture(dayTex, "assets/earthmap1024.png");
    initializeTexture(bumpTex, "assets/earthbump1024.png");
    initializeTexture(cloudTex, "assets/earthcloud1024.png");
    initializeTexture(transTex, "assets/earthtrans1024.png");
    initializeTexture(lightTex, "assets/earthlight1024.png");
    initializeTexture(specTex, "assets/earthspec1024.png");
    initializeTexture(waterBump, "assets/normalmap.png");
    initializeTexture(waterSpec, "assets/wavemap18.png");

    function initCubeTextrue(texture, faces) {
        for (var i = 0; i < faces.length; i++) {
            var face = faces[i][0];
            var image = new Image();
            image.onload = function (texture, face, image) {
                return function () {
                    //connect the cube map and return as one texture
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                }
            }(texture, face, image);
            image.src = faces[i][1];
        }
    }

    skyboxFaces[0] = [gl.TEXTURE_CUBE_MAP_POSITIVE_X, "assets/GalaxyLf.png"];
    skyboxFaces[1] = [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "assets/GalaxyRt.png"];
    skyboxFaces[2] = [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "assets/GalaxyUp.png"];
    skyboxFaces[3] = [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "assets/GalaxyDn.png"];
    skyboxFaces[4] = [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "assets/GalaxyFt.png"];
    skyboxFaces[5] = [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "assets/GalaxyBk.png"];

    initCubeTextrue(skyboxTex, skyboxFaces);

}());
