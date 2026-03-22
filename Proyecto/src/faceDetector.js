// ===== MediaPipe FaceLandmarker Wrapper =====
// Esta clase encapsula toda la lógica de detección facial.
// Usa el modelo FaceLandmarker de @mediapipe/tasks-vision que devuelve:
//   - 478 landmarks (puntos 3D del rostro)
//   - blendshapes: ~52 valores 0-1 que describen expresiones faciales (boca, ojos, cejas...)
class FaceDetector {
  constructor() {
    this.faceLandmarker = null; // instancia del modelo, null hasta que init() termine
    this.ready          = false; // true cuando el modelo está listo para detectar
    this.lastTimestamp  = -1;    // evita enviar el mismo timestamp dos veces (MediaPipe lo rechaza)
  }

  // Carga e inicializa el modelo de MediaPipe.
  // Es async porque descarga el modelo y lo compila en GPU.
  // Solo se llama una vez, cuando el usuario pulsa "Empezar".
  async init() {
    // Import dinámico del bundle de MediaPipe (ES module)
    const { FaceLandmarker, FilesetResolver } = await import(
      '../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'
    );

    // FilesetResolver carga los archivos WASM necesarios para ejecutar el modelo
    const vision = await FilesetResolver.forVisionTasks(
      '../node_modules/@mediapipe/tasks-vision/wasm'
    );

    // Crea el detector con las opciones del proyecto
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '../assets/models/face_landmarker.task', // archivo del modelo
        delegate: 'GPU'  // usa la GPU del dispositivo para acelerar la inferencia
      },
      runningMode: 'VIDEO',       // modo vídeo: optimizado para streams continuos (vs IMAGE)
      numFaces: 1,                // solo detectamos una cara a la vez
      outputFaceBlendshapes: true,               // necesario para jawOpen, mouthFunnel, etc.
      outputFacialTransformationMatrixes: false  // no necesitamos la matriz 3D de la cabeza
    });

    this.ready = true;
    console.log('FaceLandmarker initialized');
  }

  // Ejecuta la detección sobre el frame actual del vídeo.
  // Se llama cada frame desde el draw loop de p5.js.
  // Devuelve el resultado de MediaPipe o null si no se puede detectar.
  detect(videoElement) {
    // Guardas: modelo no listo, vídeo no disponible, o vídeo sin datos aún
    if (!this.ready || !videoElement || videoElement.readyState < 2) return null;

    const timestamp = performance.now(); // timestamp en ms con alta precisión

    // MediaPipe en modo VIDEO requiere timestamps estrictamente crecientes
    if (timestamp <= this.lastTimestamp) return null;
    this.lastTimestamp = timestamp;

    try {
      return this.faceLandmarker.detectForVideo(videoElement, timestamp);
    } catch (e) {
      console.warn('Detection error:', e);
      return null;
    }
  }

  // ---- Helpers genéricos ----------------------------------------

  // Devuelve el score (0-1) de cualquier blendshape por su nombre.
  // Si no hay resultado o no existe el blendshape, devuelve 0.
  // Ejemplo: getBlendshape(result, 'jawOpen') → 0.75
  getBlendshape(result, name) {
    if (!result?.faceBlendshapes?.[0]) return 0;
    const cat = result.faceBlendshapes[0].categories.find(
      c => c.categoryName === name
    );
    return cat ? cat.score : 0;
  }

  // ---- Helpers específicos --------------------------------------

  // Apertura de la mandíbula (0 = cerrada, 1 = muy abierta).
  // Es el sensor principal del juego: controla las partículas y el progreso.
  getJawOpen(result) {
    return this.getBlendshape(result, 'jawOpen');
  }

  // Boca en forma de "O" / como si soplara (0-1).
  getMouthFunnel(result) {
    return this.getBlendshape(result, 'mouthFunnel');
  }

  // Dirección horizontal de la mirada:
  //   < 0 → mira a la izquierda (desde el punto de vista del usuario)
  //   > 0 → mira a la derecha
  //   rango aprox. -1..1
  getEyeDirectionX(result) {
    if (!result?.faceBlendshapes?.[0]) return 0;

    // Nota: los nombres son desde la perspectiva del modelo (espejado respecto al usuario)
    // eyeLookInLeft  = ojo izquierdo mirando hacia la nariz  → hacia la DERECHA real
    // eyeLookOutLeft = ojo izquierdo mirando hacia fuera     → hacia la IZQUIERDA real
    const inL  = this.getBlendshape(result, 'eyeLookInLeft');
    const outL = this.getBlendshape(result, 'eyeLookOutLeft');
    const inR  = this.getBlendshape(result, 'eyeLookInRight');
    const outR = this.getBlendshape(result, 'eyeLookOutRight');

    // Promediamos ambos ojos para mayor estabilidad
    const lookLeft  = (outL + inR)  / 2; // ambos ojos miran a la izquierda del usuario
    const lookRight = (inL  + outR) / 2; // ambos ojos miran a la derecha del usuario
    return lookRight - lookLeft; // >0 = derecha, <0 = izquierda
  }

  // Centro de la boca en coordenadas normalizadas (0-1).
  // x=0 es izquierda del frame, x=1 es derecha.
  // Se usa para posicionar las partículas encima de la boca del usuario.
  getMouthPosition(result) {
    if (!result?.faceLandmarks?.[0]) return null;
    const lm = result.faceLandmarks[0];
    // Landmark 13 = labio superior interior, 14 = labio inferior interior
    return {
      x: (lm[13].x + lm[14].x) / 2,
      y: (lm[13].y + lm[14].y) / 2
    };
  }

  // Punta de la nariz (landmark índice 1) en coordenadas normalizadas.
  // Útil como cursor alternativo si se quisiera controlar algo con la cabeza.
  getNoseTip(result) {
    if (!result?.faceLandmarks?.[0]) return null;
    return result.faceLandmarks[0][1];
  }

  // Devuelve el array completo de 478 landmarks del rostro ({x, y, z} normalizados).
  // Útil si quieres acceder a cualquier punto del rostro directamente.
  getLandmarks(result) {
    if (!result?.faceLandmarks?.[0]) return null;
    return result.faceLandmarks[0];
  }
}
