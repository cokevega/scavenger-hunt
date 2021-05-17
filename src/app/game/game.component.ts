import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { gsap } from "gsap";
import * as THREE from 'three';
import * as font from 'three/examples/fonts/helvetiker_bold.typeface.json';

declare const OX: any;
declare const OnirixSDK: any;

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {

  config: Object = {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc1OTcsInByb2plY3RJZCI6MTU2NjAsInJvbGUiOjMsImlhdCI6MTYyMDkwMDA4MX0.gPIkin0eMeQl9_Rc7nb1pNKql7S_UhuRTRykity9pyE',
    mode: OnirixSDK.TrackingMode.Image
  }
  id!:string;
  scene: THREE.Scene=new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  model!: THREE.Mesh;
  clock: THREE.Clock = new THREE.Clock();
  textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  colors: Map<string, string> = new Map();
  animation: number = 0;
  coinTween!: gsap.core.Tween;
  score!:number;
  points: Map<string,number>=new Map();
  textMesh!: THREE.Mesh;

  constructor(private router:Router,private activatedRoute:ActivatedRoute) {
    this.colors.set(this.id, 'lightgreen');
    this.points.set(this.id,10);
    this.score=(localStorage.getItem('score')!==null)?parseInt(localStorage.getItem('score')!):0;
  }
  ngOnInit(): void {
    //Check the user identity
    if(localStorage.getItem('name')===null) {
      location.href="/register";
    }
    //Which coin will be loaded
    this.activatedRoute.queryParams.subscribe(params=> {
      this.id=params['id'];
    });
    OX.init(this.config).then((rendererCanvas: any) => {
      // Setup ThreeJS renderer
      this.setupRenderer(rendererCanvas);
      //Add click event
      document.addEventListener('click', (ev: MouseEvent) => {
        const mouseX = ev.clientX;
        const mouseY = ev.clientY;
        const canvasRect = this.renderer.domElement.getBoundingClientRect();
        const mouse = {
          x: ((mouseX - canvasRect.left) / canvasRect.width) * 2 - 1,
          y: -((mouseY - canvasRect.top) / canvasRect.height) * 2 + 1
        };
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        let intersects: THREE.Intersection[] = raycaster.intersectObject(this.model);
        //Evaluate if raycaster intersects the coin and render the coin's catching animation
        if (intersects.length > 0) {
          this.coinTween.pause();
          this.scene.add(this.textMesh);
          gsap.to(this.model.rotation, { x: 0.5 * Math.PI,y:0,z:0, duration: 0.5 });
          gsap.to(this.model.position, {
            z: -1,
            duration: 1,
            delay: 0.5,
            onStart: () => {
              gsap.to(this.model.rotation, { x: 8 * Math.PI, duration: 2 });
            },
            onComplete: () => {
              gsap.to(this.model.position, {
                z: 0,
                duration: 1,
                onComplete: () => {
                  gsap.to(this.model.scale, { x: 1.5, 
                    y: 1.5, 
                    z: 1.5, 
                    duration: 1, 
                    delay: 0.5,
                    onStart: ()=> {
                      gsap.to(this.textMesh.scale,{
                        x: 0.007,
                        y:0.007,
                        z:0.007,
                        duration: 2,
                        delay: 0.5,
                        onComplete: ()=> {
                          setTimeout(() => {
                            this.scene.remove(this.textMesh);
                          }, 500);
                          location.href="/score";
                        }
                      });
                    }
                  });
                }
              });
            }
          });
          //Score
          if(localStorage.getItem(this.id)) {
            localStorage.setItem('repeated','true');
          }
          else {
            if (localStorage.getItem('score')) {
              this.score+=this.points.get(this.id)!;
            }
            else {
              this.score=this.points.get(this.id)!;
            }
            localStorage.setItem('score',this.score.toString());
            localStorage.setItem(this.id,'true');
          }
        }
      });
      // Initialize render loop
      this.renderLoop();
      OX.subscribe(OnirixSDK.Events.OnDetected, (id: string) => {
        console.log("Detected Image: " + id);
        // Diplay 3D model
        this.scene.add(this.model);
        // It is useful to synchronize scene background with the camera feed
        this.scene.background = new THREE.VideoTexture(OX.getCameraFeed());
      });

      OX.subscribe(OnirixSDK.Events.OnPose, (pose: any) => {
        this.updatePose(pose);
      });

      OX.subscribe(OnirixSDK.Events.OnLost, (id: string) => {
        console.log("Lost Image: " + id);
        // Hide 3D model
        this.scene.remove(this.model);
        this.scene.remove(this.textMesh);
        this.scene.background = null;
      });

      OX.subscribe(OnirixSDK.Events.OnResize, () => {
        this.onResize();
      });

    }).catch((error: any) => {
      console.log(error);
    });
  }

  setupRenderer(rendererCanvas: any) {
    const width = rendererCanvas.width;
    const height = rendererCanvas.height;
    // Initialize renderer with rendererCanvas provided by Onirix SDK
    this.renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(width, height);
    // Ask Onirix SDK for camera parameters to create a 3D camera that fits with the AR projection.
    const cameraParams = OX.getCameraParameters();
    this.camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
    this.camera.matrixAutoUpdate = false;

    // Add some lights
    const ambientLight = new THREE.AmbientLight(0xcccccc, 1);
    this.scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
    this.scene.add(hemisphereLight);

    // Load the coin
    this.loadCoin(this.id);
  }

  updatePose(pose: any) {
    // When a new pose is detected, update the 3D camera
    let modelViewMatrix = new THREE.Matrix4();
    modelViewMatrix = modelViewMatrix.fromArray(pose);
    this.camera.matrix = modelViewMatrix;
    this.camera.matrixWorldNeedsUpdate = true;
  }

  onResize() {
    // When device orientation changes, it is required to update camera params.
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const cameraParams = OX.getCameraParameters();
    this.camera.fov = cameraParams.fov;
    this.camera.aspect = cameraParams.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    // Just render the scene
    this.renderer.render(this.scene, this.camera);
  }

  renderLoop() {
    const time = this.clock.getElapsedTime();
    if (!this.coinTween?.paused()) {
      this.coinTween = gsap.to(this.model.rotation, { z: time });
    }
    this.render();
    this.animation = requestAnimationFrame(() => this.renderLoop());
  }

  loadCoin(id: string) {
    //Coin
    const coinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 1000, 1000);
    const color = this.colors.get(id);
    const coinMaterial = new THREE.MeshBasicMaterial({ color });
    this.model = new THREE.Mesh(coinGeometry, coinMaterial);
    this.scene.add(this.model);
    coinGeometry.dispose();
    //Points text
    const textGeometry=new THREE.TextGeometry(
      `+${this.points.get(this.id)!.toString()}`,
      {
        font: new THREE.Font(font),
        height: 5,
        curveSegments: 30,
        bevelEnabled: true,
      }
    );
    textGeometry.center();
    const textMaterial=new THREE.MeshBasicMaterial({color: 'white', transparent: true, opacity: 0.9 });
    this.textMesh=new THREE.Mesh(textGeometry,textMaterial);
    this.textMesh.scale.x=0.00001;
    this.textMesh.scale.y=0.00001;
    this.textMesh.scale.z=0.00001;
    this.textMesh.rotation.x=-0.5*Math.PI;
    this.textMesh.position.y=0.5;
  }
}