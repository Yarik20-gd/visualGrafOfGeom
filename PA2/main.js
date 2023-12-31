'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function parametersChanged() {
    surface.BufferData(...CreateSurfaceData());
    centerOfMass[0] /= surface.count
    centerOfMass[1] /= surface.count
    centerOfMass[2] /= surface.count
    draw()
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    // gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(modelViewProjection, m4.translation(-centerOfMass[0], -centerOfMass[1], -centerOfMass[2])));

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0.5, 0.5, 0.9, 1]);
    gl.uniform3fv(shProgram.iP, [document.getElementById('pX').value, document.getElementById('pY').value, -1]);
    gl.uniform3fv(shProgram.iD, [0, 0, 1]);
    gl.uniform1f(shProgram.iL, document.getElementById('l').value);
    gl.uniform1f(shProgram.iS, document.getElementById('s').value);

    surface.Draw();
}
let infinity = 1;
let numOfSteps = 10;
function CreateSurfaceData() {
    a = parseFloat(document.getElementById('a').value);
    b = parseFloat(document.getElementById('b').value);
    c = parseFloat(document.getElementById('c').value);
    m = parseFloat(document.getElementById('m').value)
    centerOfMass = [0, 0, 0]
    let vertexList = [],
        normalList = [],
        u = 0,
        v = 0;
    infinity = parseFloat(document.getElementById('infinity').value)
    numOfSteps = parseInt(document.getElementById('numOfSteps').value)
    let V_STEP = infinity / numOfSteps
    while (u < 2 * Math.PI) {
        while (v < infinity) {
            let vertexA = WallisConicalEdge(u, v)
            let vertexB = WallisConicalEdge(u + 0.1, v)
            let vertexC = WallisConicalEdge(u, v + V_STEP)
            let vertexD = WallisConicalEdge(u + 0.1, v + V_STEP)
            let normalA = calculateNormal(u, v)
            let normalB = calculateNormal(u + 0.1, v)
            let normalC = calculateNormal(u, v + V_STEP)
            let normalD = calculateNormal(u + 0.1, v + V_STEP)
            vertexList.push(...vertexA)
            vertexList.push(...vertexB)
            vertexList.push(...vertexC)
            vertexList.push(...vertexC)
            vertexList.push(...vertexB)
            vertexList.push(...vertexD)

            normalList.push(...normalA)
            normalList.push(...normalB)
            normalList.push(...normalC)
            normalList.push(...normalC)
            normalList.push(...normalB)
            normalList.push(...normalD)
            v += V_STEP;
        }
        v = 0
        u += 0.1
    }
    return [vertexList, normalList];

}
let a = 1, b = 0, c = 1, m = 0.5
let centerOfMass = [0, 0, 0]
function WallisConicalEdge(u, v) {
    const x = v * Math.cos(u),
        y = v * Math.sin(u),
        z = c * Math.sqrt(a * a - b * b * Math.pow(Math.cos(u), 2));
    centerOfMass[0] += x * m
    centerOfMass[1] += y * m
    centerOfMass[2] += z * m
    return [x * m, y * m, z * m];
}

let delta = 0.0001;

function calculateNormal(u, v) {
    let u1 = WallisConicalEdge(u, v),
        u2 = WallisConicalEdge(u + delta, v),
        v1 = WallisConicalEdge(u, v),
        v2 = WallisConicalEdge(u, v + delta);
    const dU = [], dV = []
    for (let i = 0; i < 3; i++) {
        dU.push((u1[i] - u2[i]) / delta)
        dV.push((v1[i] - v2[i]) / delta)
    }
    const n = m4.normalize(m4.cross(dU, dV))
    return n
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iL = gl.getUniformLocation(prog, "l");
    shProgram.iD = gl.getUniformLocation(prog, "d");
    shProgram.iS = gl.getUniformLocation(prog, "s");
    shProgram.iP = gl.getUniformLocation(prog, "p");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());
    centerOfMass[0] /= surface.count
    centerOfMass[1] /= surface.count
    centerOfMass[2] /= surface.count


    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
