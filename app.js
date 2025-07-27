const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

const shapeColors = {
  circle: { fill: "rgba(255, 165, 0, 0.6)", stroke: "#FFA500" },
  square: { fill: "rgba(0, 128, 255, 0.6)", stroke: "#0080FF" },
  triangle: { fill: "rgba(0, 200, 100, 0.6)", stroke: "#00C864" },
  rectangle: { fill: "rgba(220, 20, 60, 0.6)", stroke: "#DC143C" }
};

const shapes = [
  { name: "circle", x: 100, y: 300, placed: false },
  { name: "square", x: 250, y: 300, placed: false },
  { name: "triangle", x: 400, y: 300, placed: false },
  { name: "rectangle", x: 550, y: 300, placed: false },
];

const targets = [
  { name: "circle", x: 100, y: 100 },
  { name: "square", x: 250, y: 100 },
  { name: "triangle", x: 400, y: 100 },
  { name: "rectangle", x: 550, y: 100 },
];

let dragging = null;

function drawTargets() {
  for (const target of targets) {
    const color = shapeColors[target.name];
    canvasCtx.strokeStyle = color.stroke;
    canvasCtx.lineWidth = 3;
    if (target.name === "circle") {
      canvasCtx.beginPath();
      canvasCtx.arc(target.x, target.y, 40, 0, Math.PI * 2);
      canvasCtx.stroke();
    } else if (target.name === "square") {
      canvasCtx.strokeRect(target.x - 40, target.y - 40, 80, 80);
    } else if (target.name === "triangle") {
      drawTriangle(target.x, target.y, 80, false, color.stroke);
    } else if (target.name === "rectangle") {
      canvasCtx.strokeRect(target.x - 60, target.y - 30, 120, 60);
    }
  }
}

function drawShapes() {
  for (const shape of shapes) {
    const color = shapeColors[shape.name];
    canvasCtx.fillStyle = color.fill;
    if (shape.name === "circle") {
      canvasCtx.beginPath();
      canvasCtx.arc(shape.x, shape.y, 40, 0, Math.PI * 2);
      canvasCtx.fill();
    } else if (shape.name === "square") {
      canvasCtx.fillRect(shape.x - 40, shape.y - 40, 80, 80);
    } else if (shape.name === "triangle") {
      drawTriangle(shape.x, shape.y, 80, true, color.fill);
    } else if (shape.name === "rectangle") {
      canvasCtx.fillRect(shape.x - 60, shape.y - 30, 120, 60);
    }
  }
}

function drawTriangle(cx, cy, size, fill, color) {
  const height = (size * Math.sqrt(3)) / 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(cx, cy - height / 2);
  canvasCtx.lineTo(cx - size / 2, cy + height / 2);
  canvasCtx.lineTo(cx + size / 2, cy + height / 2);
  canvasCtx.closePath();
  if (fill) {
    canvasCtx.fillStyle = color;
    canvasCtx.fill();
  } else {
    canvasCtx.strokeStyle = color;
    canvasCtx.stroke();
  }
}

function isInside(x, y, shape) {
  if (shape.name === "circle") {
    return Math.hypot(shape.x - x, shape.y - y) < 40;
  } else if (shape.name === "square") {
    return Math.abs(shape.x - x) < 40 && Math.abs(shape.y - y) < 40;
  } else if (shape.name === "triangle") {
    const size = 80;
    const height = (size * Math.sqrt(3)) / 2;
    const p = { x, y };

    const a = { x: shape.x, y: shape.y - height / 2 };
    const b = { x: shape.x - size / 2, y: shape.y + height / 2 };
    const c = { x: shape.x + size / 2, y: shape.y + height / 2 };

    function sign(p1, p2, p3) {
      return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }

    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);

    const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(has_neg && has_pos);
  } else if (shape.name === "rectangle") {
    return Math.abs(shape.x - x) < 60 && Math.abs(shape.y - y) < 30;
  }
  return false;
}

function checkSnap(shape) {
  const target = targets.find((t) => t.name === shape.name);
  if (
    Math.abs(shape.x - target.x) < 30 &&
    Math.abs(shape.y - target.y) < 30
  ) {
    shape.x = target.x;
    shape.y = target.y;
    shape.placed = true;
    dragging = null;

    // Check if all shapes placed
    if (shapes.every(s => s.placed)) {
      checkGestureMatch("success");
    }
  }
}

function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  drawTargets();
  drawShapes();

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const thumb = landmarks[4];
    const index = landmarks[8];
    const middle = landmarks[12];

    const pinch =
      distance(thumb, index) < 0.05 && distance(thumb, middle) < 0.05;

    const cx = index.x * canvasElement.width;
    const cy = index.y * canvasElement.height;

    if (pinch) {
      canvasCtx.beginPath();
      canvasCtx.arc(cx, cy, 10, 0, Math.PI * 2);
      canvasCtx.fillStyle = "red";
      canvasCtx.fill();

      if (!dragging) {
        dragging = shapes.find((s) => !s.placed && isInside(cx, cy, s));
      }
      if (dragging) {
        dragging.x = cx;
        dragging.y = cy;
      }
    } else if (dragging) {
      checkSnap(dragging);
    }

    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 3,
    });
    drawLandmarks(canvasCtx, landmarks, {
      color: "#FF0000",
      lineWidth: 2,
    });
  }
}

function distance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// === MediaPipe Setup ===
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();
