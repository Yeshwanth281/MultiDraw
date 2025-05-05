import { getExistingShapes, Shape, Tool } from "./http";

export class Game {

private canvas: HTMLCanvasElement;
private ctx: CanvasRenderingContext2D;
private existingShapes: Shape[];
private roomId: string
private socket: WebSocket;
private clicked: boolean = false;
private startX: number = 0;
private startY: number = 0;
private currentPath:{ x: number; y: number }[] = [];
private selectedTool: Tool = ""
constructor(canvas:HTMLCanvasElement, roomId: string, socket: WebSocket){
this.canvas = canvas;
this.ctx = this.canvas.getContext("2d")!;
this.existingShapes=[];
this.roomId = roomId;
this.socket = socket;
this.init();
this.initHandlers();
this.initMouseHandlers();
this.initResizeHandler();
}

private initResizeHandler() {
window.addEventListener("resize", this.resizeCanvas);
}

private resizeCanvas = () => {
this.canvas.width = window.innerWidth;
this.canvas.height = window.innerHeight;
this.clearCanvas();
};

destroy(){
this.canvas.removeEventListener("mousedown", this.mouseDownHandler);

this.canvas.removeEventListener("mouseup", this.mouseUpHandler);

this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
}

setTool(tool:Tool){
this.selectedTool = tool;
}

async init() {
this.existingShapes = await getExistingShapes(this.roomId);
this.clearCanvas();
}

initHandlers() {
this.socket.onmessage =(event) =>{
const message = JSON.parse(event.data);

  if (message.type === "shape") {
    this.existingShapes.push({
      type: message.shapeType,
      ...message.shapeData
    });
    this.clearCanvas();
  }
  
}
}

clearCanvas() {
this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
this.ctx.fillStyle = "black";
this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

this.existingShapes.map((shape)=> {
  if(shape.type === "rect"){
    this.ctx.strokeStyle = "white";
    this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  } else if(shape.type === "circle") {
    this.ctx.beginPath();
    this.ctx.ellipse(
      shape.centerX,
      shape.centerY,
      shape.radiusX,
      shape.radiusY,
      0,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();
    this.ctx.closePath();
  }else if (shape.type === "pencil") {
    this.ctx.beginPath();
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    }
    this.ctx.stroke();
    this.ctx.closePath();
  }
})
}

mouseDownHandler = (e:MouseEvent) =>{
this.clicked = true;
//console.log("mousedown", e.clientX, e.clientY);
this.startX = e.clientX;
this.startY = e.clientY;

  const selectedTool = this.selectedTool;
if (selectedTool === "pencil") {
  this.currentPath = [{ x: e.clientX, y: e.clientY }];
}
}

mouseUpHandler = (e:MouseEvent) => {

this.clicked = false;
  
const selectedTool = this.selectedTool;
if(selectedTool === "rect") {
  const width = e.clientX - this.startX;
const height = e.clientY - this.startY;
const shape: Shape ={
  type: "rect",
  x: this.startX,
  y: this.startY,
  height,
  width
}
this.existingShapes.push(shape);
this.socket.send(JSON.stringify({
  type: "shape",
  roomId: this.roomId,
  shapeType: "rect",
  shapeData: shape
}));

} else if(selectedTool === "circle") {
  const width = e.clientX - this.startX;
  const height = e.clientY - this.startY;

  const centerX = this.startX + width / 2;
  const centerY = this.startY + height / 2;

  const shape: Shape = {
    type: "circle", // name stays "circle"
    centerX,
    centerY,
    radiusX: Math.abs(width) / 2,
    radiusY: Math.abs(height) / 2,
  };

  this.existingShapes.push(shape);

  this.socket.send(JSON.stringify({
    type: "shape",
    roomId: this.roomId,
    shapeType: "circle",
    shapeData: shape
  }));
  
}else if (selectedTool === "pencil") {
  this.clicked = false;

  const shape: Shape = {
    type: "pencil",
    points: this.currentPath
  };

  this.existingShapes.push(shape);

  this.socket.send(JSON.stringify({
    type: "shape",
    roomId: this.roomId,
    shapeType: "pencil",
    shapeData: shape
  }));
  

  this.currentPath = [];
}
}

mouseMoveHandler = (e:MouseEvent) => {

if(this.clicked){
  const width = e.clientX - this.startX;
  const height = e.clientY - this.startY;
  this.clearCanvas();
  this.ctx.strokeStyle = "white";
  
  const selectedTool = this.selectedTool;
  if (selectedTool === "rect"){
    this.ctx.strokeRect(this.startX, this.startY, width, height);
  } else if (selectedTool ==="circle"){
    this.ctx.beginPath();
    const centerX = this.startX + width / 2;
    const centerY = this.startY + height / 2;
    //const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
    //this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.ellipse(centerX, centerY, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.closePath();
  } else if (selectedTool === "pencil" && this.clicked) {
    this.currentPath.push({ x: e.clientX, y: e.clientY });

    // Draw live preview
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const p1 = this.currentPath[i];
      const p2 = this.currentPath[i + 1];
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    }
    this.ctx.stroke();
  }
  
}
}

initMouseHandlers() {
this.canvas.addEventListener("mousedown", this.mouseDownHandler);

this.canvas.addEventListener("mouseup", this.mouseUpHandler);

this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
}
}
