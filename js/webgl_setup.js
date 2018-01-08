
var textureLoaded = false;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var cubeShape;
var cubeRender;

var quadShape;
var quadRender;

var rttN;
var rttD;
var rttP;
var rttC;

// initialize the rendering contexts
function init() {
    // console.log("init")

    // create the model vertex data
    cubeShape = new Cube();

    // create the opengl buffers
    cubeRender = new Renderable(cubeShape, false);
    cubeRender.initShaders('basic');
    cubeRender.initBuffers();

    quadShape = new Quad();
    quadRender = new Renderable(quadShape, true);
    quadRender.initShaders('basic');
    quadRender.initBuffers();

    rttN = new RenderToTexture(512);
    rttN.initFrameBuffer();

    rttD = new RenderToTexture(512);
    rttD.initFrameBuffer();

    rttP = new RenderToTexture(512);
    rttP.initFrameBuffer();

    rttC = new RenderToTexture(512);
    rttC.initFrameBuffer();

}

var cubeTexture;
function initTexture() {
    cubeTexture = gl.createTexture();
    cubeTexture.image = new Image();
    cubeTexture.image.onload = function() { handleLoadedTexture(cubeTexture); }
cubeTexture.image.src = "data/sunset-1.jpg";
}

function handleLoadedTexture(texture) {
    // console.log("handleLoadedTexture")
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
    textureLoaded = true;
}

var sceneRotate = 0;

function drawBaseScene(mode) {
    // console.log("drawBaseScene")

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera matrix
    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 20.0);

    mat4.translate(pMatrix, pMatrix, [-1.5, 0.5, -7.0]);
    mat4.rotateX(pMatrix, pMatrix, 0.4);
    mat4.rotateY(pMatrix, pMatrix, sceneRotate);

    // modeling matrix
    mat4.identity(mvMatrix);

    //bind opengl buffers
    cubeRender.bindBuffers();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);

    cubeRender.setFragUniforms(mode, dx, dy);

    // transform and draw
    cubeRender.setVertUniforms(pMatrix, mvMatrix);
    cubeRender.draw();

    mat4.translate(mvMatrix, mvMatrix, [2.5, 0.0, 0.0]);
    cubeRender.setVertUniforms(pMatrix, mvMatrix);
    cubeRender.draw();

    mat4.translate(mvMatrix, mvMatrix, [0.0, 0.0, 2.0]);
    cubeRender.setVertUniforms(pMatrix, mvMatrix);
    cubeRender.draw();

    mat4.translate(mvMatrix, mvMatrix, [0.0, 2.0, -2.0]);
    cubeRender.setVertUniforms(pMatrix, mvMatrix);
    cubeRender.draw();
}

function drawScene() {
    // console.log("drawScene")

    // -- Render the base scene to a frame buffer texture
    rttN.bind();
    gl.clearColor(0., -1., 0., 1.);
    drawBaseScene(1); // output normals
    rttN.unbind();

    rttD.bind();
    gl.clearColor(100., 100., 100., 1.);
    drawBaseScene(2); // output depth
    rttD.unbind();

    rttP.bind();
    gl.clearColor(0., -100., 0., 1.);
    drawBaseScene(4); // output position
    rttP.unbind();

    rttC.bind();
    gl.clearColor(0., 0., 0.3, 1.);
    drawBaseScene(0); // output color
    rttC.unbind();

    // -- Render the scene using the frame buffer texture

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    gl.clearColor(0.3, 0.0, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera matrix
    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 10.0);
    mat4.translate(pMatrix, pMatrix, [0.0, 0.0, -2.5]);

    // modeling matrix
    mat4.identity(mvMatrix);

    quadRender.bindBuffers();

    gl.activeTexture(gl.TEXTURE0);
    rttN.bindTexture();

    gl.activeTexture(gl.TEXTURE1);
    rttD.bindTexture();

    gl.activeTexture(gl.TEXTURE2);
    rttP.bindTexture();

    gl.activeTexture(gl.TEXTURE3);
    rttC.bindTexture();

    gl.activeTexture(gl.TEXTURE0);

    // Output 3 is occlusion
    quadRender.setFragUniforms(3, dx, dy);

    // transform
    quadRender.setVertUniforms(pMatrix, mvMatrix);

    // render
    quadRender.draw();


}

var deltaT = 0;
var prevT = 0;
function step() {

    var currT = new Date().getTime();

    if (prevT != 0) {
        deltaT = currT - prevT;
        deltaT *= 0.001; // convert ms to s
    }
    prevT = currT;

    // Dont render the scene until the texture image has loaded
    if (textureLoaded) {
        var useRtt = document.getElementById("useRtt").checked;

        var speedString = document.getElementById("speedInput").value;
        var rotSpeed = 0;
        var speedFloat = parseFloat(speedString);
        if (speedFloat)
            rotSpeed = speedFloat;

        sceneRotate += rotSpeed*deltaT;

        if (useRtt) {
            drawScene();
        }
        else {
            gl.clearColor(0., 0., .3, 1.);
            drawBaseScene(0);
        }
    }
    window.requestAnimationFrame(step);
}

var dx = 0.0;
var dy = 0.0;

function webGLStart() {
    //console.log("webGLStart")

    var canvas = document.getElementById("webgl-canvas");

    initGL(canvas);

    init();

    initTexture();

    gl.enable(gl.DEPTH_TEST);

    //drawScene();

    dx = 1.0 / gl.viewportWidth;
    dy = 1.0 / gl.viewportHeight;

    window.requestAnimationFrame(step);
}
