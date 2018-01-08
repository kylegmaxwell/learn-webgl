var basicVertShader = `// inputs
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec4 aVertexColor;
attribute vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// outputs
varying vec4 vPosition;
varying vec4 vColor;
varying vec3 vNormal;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec4 vWSPos;

void main(void)
{
    // Use the modeling matrix to compute the world space positions
    vWSPos = uMVMatrix * vec4(aVertexPosition, 1.0);

    // Use the perspective matrix to compute the screen space positions
    vec4 pos = uPMatrix * vWSPos;

    vColor = aVertexColor;
    vNormal = aVertexNormal;
    vDepth = pos.z;
    vTextureCoord = aTextureCoord;

    gl_Position = pos;
    vPosition = gl_Position;
}`;