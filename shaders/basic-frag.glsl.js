var basicFragShader = `precision mediump float;

varying vec4 vPosition;
varying vec4 vColor;
varying vec3 vNormal;
varying float vDepth;
varying vec2 vTextureCoord;
varying vec4 vWSPos;

uniform sampler2D uSampler0; // Normal
uniform sampler2D uSampler1; // Depth
uniform sampler2D uSampler2; // Position
uniform sampler2D uSampler3; // Color

uniform int uOutputType;

// Pixel width for samplers
uniform float uDx;
uniform float uDy;

#define boxFilterSize 2
vec4 sampleBox(vec2 uv) {

    vec4 color = vec4(0., 0., 0., 1.);

    vec2 scale = vec2(uDx, uDy);

    float count = 0.0;
    for (int i = -boxFilterSize; i <= boxFilterSize; i++) {
        for (int j = -boxFilterSize; j <= boxFilterSize; j++) {
            color += texture2D(uSampler1, uv + scale * vec2(i, j));
            count++;
        }
    }
    color /= count;

    return color;
}

float sampleDepth(vec2 uv, int i, int j) {
    vec2 scale = vec2(uDx, uDy);
    float d = texture2D(uSampler1, uv + scale * vec2(i, j)).x;
    return d;
}

vec3 sampleNormal(vec2 uv, int i, int j) {
    vec2 scale = vec2(uDx, uDy);
    vec3 n = texture2D(uSampler0, uv + scale * vec2(i, j)).xyz;
    // Unscale the normal after packing into positive values
    return 2.0*(-0.5+n);
}

vec3 samplePosition(vec2 uv, int i, int j) {
    vec2 scale = vec2(uDx, uDy);
    vec3 p = texture2D(uSampler2, uv + scale * vec2(i, j)).xyz;
    /*
    vec3 pos = vec3(0.0, 0.0, 0.0);
    pos.xy = uv + scale * vec2(i, j);
    pos.z = sampleDepth(pos.xy, 0, 0);
    if (pos.z < 0.01)
        pos.z = 100.0;
    return pos;*/
    return p;
}

#define filterSize 2

float threshDepth(vec2 uv) {

    float d = sampleDepth(uv, 0, 0);
    for (int i = -filterSize; i <= filterSize; i++) {
        for (int j = -filterSize; j <= filterSize; j++) {
            float d2 = sampleDepth(uv, i, j);
            if (abs(d - d2)>0.05)
                return 1.0;
        }
    }
    return 0.0;
}

float threshNormal(vec2 uv) {

    vec3 n = sampleNormal(uv, 0, 0);

    for (int i = -filterSize; i <= filterSize; i++) {
        for (int j = -filterSize; j <= filterSize; j++) {
            vec3 n2 = sampleNormal(uv, i, j);
            float dist = distance(n, n2);
            if (dist > 0.09)
                return 1.0;
        }
    }
    return 0.0;
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rand2(vec2 co) {
    return vec2(rand(co), rand(co+vec2(0.3,0.7)));
}

vec2 perp(vec2 v) {
    return vec2(v.y, -v.x);
}

vec3 getTangent(vec3 n) {

    vec3 tmp = vec3(0,1,0);

    if (abs(n.y) > abs(n.x) && abs(n.y) > abs(n.z))
        tmp = vec3(1,0,0);

    vec3 tan = cross(n, tmp);
    tan = normalize(tan);
    return tan;
}

float checkVisibility(vec2 uv, vec3 n, vec3 p, vec2 off) {

    int i = int(off.x+0.5);
    int j = int(off.y+0.5);

    vec3 p2 = samplePosition(uv, i, j);
    vec3 dp = p2-p;
    float dpl = length(dp);
    if (dpl < 0.001)
        return 1.0;
    dp = normalize(dp);

    if (length(n) < 0.001)
        return 1.0;
    n = normalize(n);

    float ndp = dot(n, dp);
    float vis = 1.0-abs(ndp);

    if (ndp < 0.0) {
        vis = 1.0;
    }

    // occlusion also falls off with distance
    float range = 2.0;
    dpl = clamp(dpl, 0.0, range) / range;
    vis = mix(vis, 1.0, dpl);

    return vis;
}

/*!
brief Check the visibility of a pixel based on occlusion by its neighbors
param uv Coordinate of the reference pixel
param n Normal at the reference pixel
param p World space position of the reference pixel
param dir Sample direction in image space
param spread Distance to samples in image space
return How visible the pixel is from many directions (0 occluded to 1 visible)
*/
float areaVisibility(vec2 uv, vec3 n, vec3 p, vec2 dir, float spread) {

    float minVis = 1.0;

    vec2 off = spread * dir;
    minVis = min(minVis, checkVisibility(uv, n, p,          off ) );
    minVis = min(minVis, checkVisibility(uv, n, p,         -off ) );
    minVis = min(minVis, checkVisibility(uv, n, p,  perp(off)) );
    minVis = min(minVis, checkVisibility(uv, n, p, -perp(off)) );

    return minVis;
}

// TODO
// 1. Account for depth falloff, so more distant objects contribute less
// 2. Improve sampling method to remove screen space jitter
// 3. Figure out why some edges are occluded by background
// 4. Enable float texture filtering
// 5. Test on real house model.

#define sampleCount (4*filterSize)
float sampleOcclusion(vec2 uv) {

    float occ = 0.0;

    //Pixel properties
    vec3 n = normalize(sampleNormal(uv, 0, 0));

    vec3 p = samplePosition(uv, 0, 0);

    vec2 dir = normalize(rand2(uv));

    // compute visibility (complement of occlusion)
    float vis = 0.0;

    vis += areaVisibility(uv, n, p, dir, 8.0);
    vis += areaVisibility(uv, n, p, dir, 16.0);
    vis += areaVisibility(uv, n, p, dir, 12.0);
    vis *= 0.333;//normalize

    occ = vis;
    occ *= 2.0;
    occ = clamp(occ,0.,1.);
    return occ;
}

void main(void)
{
    vec4 nColor = vec4(vNormal.xyz, 1.0);

    float depth = vDepth;

    float zmin = 0.1;
    float zmax = 10.0;
    float d = depth - zmin;
    d /= (zmax - zmin);

    if (d > 1.0) d = 1.0;
    if (d < 0.0) d = 0.0;

    float wave = 0.5*(sin(d*50.0)+1.0);

    vec4 dColor = vec4(d,d,d,1);

    //gl_FragColor = 0.5*dColor + 0.5*nColor;

    vec2 uv = vTextureCoord.st;
    // These 3 samples are for debug
    vec4 texColor0 = texture2D(uSampler0, uv); // N
    vec4 texColor1 = texture2D(uSampler1, uv); // D
    vec4 texColor2 = texture2D(uSampler2, uv); // P
    vec4 texColor3 = texture2D(uSampler3, uv); // C

    vec4 color;
    color = vec4(0.0, 0.0, 0.0, 1.0);

    if (uOutputType==0) { // default use texture
        color = texColor0;
    }

    if (uOutputType==1) {// output normals
        // scale normal vector to pack it into positive values
        color = nColor*0.5+0.5;
    }

    if (uOutputType==2) {// output depth
        color = dColor;
    }

    if (uOutputType==4) {// output position
        color.xyz = vWSPos.xyz;
    }

    if (uOutputType==3) { // occlusion

        float occ = sampleOcclusion(vTextureCoord.st);
        color.x = occ;
        color.xyz = color.xxx;
        color.xyz = color.x * abs(texColor3.xyz);
    }

    //gl_FragColor = vec4(1,1,1,1);
    gl_FragColor = color;
}`;