var gl;
function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("There was a problem initializing WebGL.");
    }
}

// warning, this function must run on an HTTP server for chrome to access external files via jquery
function getShader(gl, type, shaderText) {
    var shader_str = ";";
    var shader;
    if (type == "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        alert("Unknown type: " + type);
        return null;
    }

    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


function Renderable (iShape, multi) {

    this.shape = iShape;

    this.vertexPositionBuffer = undefined;
    this.vertexIndexBuffer = undefined;
    this.vertexColorBuffer = undefined;
    this.vertexNormalBuffer = undefined;
    this.vertexTextureCoordBuffer = undefined;
    this.multiTexture = multi;
    this.shaderProgram = undefined;

    this.setFragUniforms = function (output, dx, dy) {
        gl.uniform1i(this.shaderProgram.samplerUniform0, 0);
        if (this.multiTexture) {
            gl.uniform1i(this.shaderProgram.samplerUniform1, 1);
            gl.uniform1i(this.shaderProgram.samplerUniform2, 2);
            gl.uniform1i(this.shaderProgram.samplerUniform3, 3);
        }
        gl.uniform1i(this.shaderProgram.outputUniform, output);
        gl.uniform1f(this.shaderProgram.dxUniform, dx);
        gl.uniform1f(this.shaderProgram.dyUniform, dy);
    }

    this.setVertUniforms = function (pMatrix, mvMatrix) {
        gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, mvMatrix);
    }

    this.initShaders = function (prefix) {
        var fragmentShader = getShader(gl, "fragment", basicFragShader);
        var vertexShader = getShader(gl, "vertex", basicVertShader);

        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(this.shaderProgram);

        this.shaderProgram.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

        this.shaderProgram.vertexColorAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(this.shaderProgram.vertexColorAttribute);

        this.shaderProgram.vertexNormalAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

        this.shaderProgram.textureCoordAttribute = gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

        this.shaderProgram.samplerUniform0 = gl.getUniformLocation(this.shaderProgram, "uSampler0");
        this.shaderProgram.samplerUniform1 = gl.getUniformLocation(this.shaderProgram, "uSampler1");
        this.shaderProgram.samplerUniform2 = gl.getUniformLocation(this.shaderProgram, "uSampler2");
        this.shaderProgram.samplerUniform3 = gl.getUniformLocation(this.shaderProgram, "uSampler3");
        this.shaderProgram.outputUniform = gl.getUniformLocation(this.shaderProgram, "uOutputType");
        this.shaderProgram.dxUniform = gl.getUniformLocation(this.shaderProgram, "uDx");
        this.shaderProgram.dyUniform = gl.getUniformLocation(this.shaderProgram, "uDy");

        this.shaderProgram.pMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uPMatrix");
        this.shaderProgram.mvMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
    }

    this.initBuffers = function () {

        //---- Position

        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.shape.vertexPositions), gl.STATIC_DRAW);

        this.vertexPositionBuffer.itemSize = 3;
        var vertCount = this.shape.vertexPositions.length / this.vertexPositionBuffer.itemSize;
        this.vertexPositionBuffer.numItems = vertCount;

        //---- Topology

        // Now send the element array to GL
        this.vertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.shape.vertexIndices), gl.STATIC_DRAW);
        this.vertexIndexBuffer.numItems = this.shape.vertexIndices.length;

        //---- Color

        this.vertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        colors = []
        for (var i=0; i < vertCount; i++) {
          colors = colors.concat([1.0, 1.0, 1.0, 1.0]);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        this.vertexColorBuffer.itemSize = 4;
        this.vertexColorBuffer.numItems = vertCount;

        //---- Normal

        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.shape.vertexNormals), gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = vertCount;

        //---- Texture
        this.vertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.shape.vertexTextureCoords), gl.STATIC_DRAW);
        this.vertexTextureCoordBuffer.itemSize = 2;
        this.vertexTextureCoordBuffer.numItems = vertCount;//cubeTextureCoords.length / this.vertexTextureCoordBuffer.itemSize;
    }

    this.bindBuffers = function () {

        gl.useProgram(this.shaderProgram);

        // position
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        // topology
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);

        // color
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //normals
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //texture
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    }

    this.draw = function () {
        gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}


function RenderToTexture (iSize) {

    this.size = iSize;
    this.frameBuffer = undefined;
    this.texture = undefined;

    this.initFrameBuffer = function () {

        // create frame buffer
        this.frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        this.frameBuffer.width = this.size;
        this.frameBuffer.height = this.size;

        // create empty texture target
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // fill texture with empty pixels

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.frameBuffer.width, this.frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        // create render buffer for depth
        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.frameBuffer.width, this.frameBuffer.height);

        // attach depth and texture buffers to frame buffer
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        console.log("STATUS " + status + " =? " + gl.FRAMEBUFFER_COMPLETE );
        // clear
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.bind = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    }

    this.unbind = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.bindTexture = function () {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
}
