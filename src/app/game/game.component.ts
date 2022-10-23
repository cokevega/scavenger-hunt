import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { gsap } from "gsap";
import * as THREE from 'three';
import * as font from 'three/examples/fonts/helvetiker_bold.typeface.json';

import { environment } from 'src/environments/environment';

declare const OX: any;
declare const OnirixSDK: any;

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GameComponent implements OnInit {

  config: Object = {
    token: environment.token,
    mode: OnirixSDK.TrackingMode.Image
  }
  id!: string;
  scene: THREE.Scene = new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  model!: THREE.Group;
  clock: THREE.Clock = new THREE.Clock();
  textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  colors: Map<string, string> = new Map();
  animation: number = 0;
  coinTween!: gsap.core.Tween;
  score!: number;
  points: Map<string, number> = new Map();
  textMesh!: THREE.Mesh;
  gltfLoader: GLTFLoader = new GLTFLoader();
  showHome: boolean = true;
  loading: boolean = false;
  envMap!: THREE.Texture;
  audioContext: AudioContext = new AudioContext();
  requestSound1: XMLHttpRequest = new XMLHttpRequest();
  requestSound2: XMLHttpRequest = new XMLHttpRequest();
  sourceBuffer1: AudioBufferSourceNode = this.audioContext.createBufferSource();
  sourceBuffer2: AudioBufferSourceNode = this.audioContext.createBufferSource();

  constructor(
    private activatedRoute: ActivatedRoute,
  ) {
    this.colors.set(environment.id1, '#2594f8');
    this.points.set(environment.id1, 150);
    this.colors.set(environment.id2, '#e7335f');
    this.points.set(environment.id2, 250);
    this.colors.set(environment.id3, '#faa300');
    this.points.set(environment.id3, 500);
    this.score = (localStorage.getItem('score')) ? parseInt(localStorage.getItem('score')!) : 0;
  }

  ngOnInit(): void {
    //Which coin will be loaded
    this.activatedRoute.params.subscribe((params: Params) => {
      this.id = params['id'];
    });
    //Check the user identity
    if (localStorage.getItem('email') === null) {
      window.location.href = `/register?from=${this.id}`;
    }
    //Environment map
    this.textureLoader.load(
      'assets/christmas_photo_studio_04_1k.jpg',
      (envMap: THREE.Texture) => {
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        envMap.encoding = THREE.sRGBEncoding;
        envMap.needsUpdate = true;
        this.envMap = envMap;
      }
    );
    //Sound effects
    this.requestSound1.open('GET', 'assets/success-sound-effect.mp3', true);
    this.requestSound1.responseType = 'arraybuffer';
    this.requestSound1.onload = () => {
      let undecodedAudio: any = this.requestSound1.response;
      this.audioContext.decodeAudioData(undecodedAudio, (buffer: AudioBuffer) => {
        this.sourceBuffer1.buffer = buffer;
        this.sourceBuffer1.connect(this.audioContext.destination);
      });
    }
    this.requestSound1.send();

    this.requestSound2.open('GET', 'assets/coin-thrown-sound.mp3', true);
    this.requestSound2.responseType = 'arraybuffer';
    this.requestSound2.onload = () => {
      let undecodedAudio: any = this.requestSound2.response;
      this.audioContext.decodeAudioData(undecodedAudio, (buffer: AudioBuffer) => {
        this.sourceBuffer2.buffer = buffer;
        this.sourceBuffer2.connect(this.audioContext.destination);
      });
    }
    this.requestSound2.send();
  }

  goBack() {
    window.location.reload();
  }

  init() {
    this.loading = true;
    this.showHome = false;
    OX.init(this.config).then((rendererCanvas: any) => {
      // Setup ThreeJS renderer
      this.setupRenderer(rendererCanvas);
      // Initialize render loop
      this.renderLoop();
      OX.subscribe(OnirixSDK.Events.OnDetected, (id: string) => {
        console.log("Detected Image: " + id);
        // Diplay 3D model
        this.scene.add(this.model);
        // It is useful to synchronize scene background with the camera feed
        this.scene.background = new THREE.VideoTexture(OX.getCameraFeed());
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
          let intersects: THREE.Intersection[] = raycaster.intersectObjects(this.model.children);
          //Evaluate if raycaster intersects the coin and render the coin's catching animation
          if (intersects.length > 0) {
            this.coinTween.pause();
            this.scene.add(this.textMesh);
            gsap.to(this.model.rotation, {
              x: 0, y: 0, z: 0, duration: 0.5
            });
            gsap.to(this.model.position, {
              z: -1,
              duration: 1,
              delay: 0.5,
              onStart: () => {
                this.sourceBuffer2.start(this.audioContext.currentTime + 0.1);
                gsap.to(this.model.rotation, { x: 7.5 * Math.PI, duration: 2 });
              },
              onComplete: () => {
                this.sourceBuffer2.stop(this.audioContext.currentTime);
                gsap.to(this.model.position, {
                  z: 0,
                  duration: 1,
                  onComplete: () => {
                    gsap.to(this.model.scale, {
                      x: 1,
                      y: 1,
                      z: 1,
                      duration: 1,
                      delay: 0.5,
                      onStart: () => {
                        gsap.to(this.textMesh.scale, {
                          x: 0.0025,
                          y: 0.0025,
                          z: 0.0025,
                          duration: 2,
                          delay: 0.5,
                          onStart: () => {
                            this.sourceBuffer1.start(this.audioContext.currentTime);
                          },
                          onComplete: () => {
                            setTimeout(() => {
                              this.sourceBuffer1.stop(this.audioContext.currentTime);
                              this.scene.remove(this.textMesh);
                            }, 500);
                            location.href = "/score/" + this.id;
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
            //Score
            if (localStorage.getItem(this.id)) {
              localStorage.setItem('repeated', 'true');
            }
            else {
              this.score += this.points.get(this.id)!;
              localStorage.setItem('score', this.score.toString());
              localStorage.setItem(this.id, 'true');
            }
          }
        });
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

      this.loading = false;
    }).catch((error: any) => {
      console.log(error);
    });
  }

  setupRenderer(rendererCanvas: any) {
    const width = rendererCanvas.width;
    const height = rendererCanvas.height;
    // Initialize renderer with rendererCanvas provided by Onirix SDK
    this.renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    // Ask Onirix SDK for camera parameters to create a 3D camera that fits with the AR projection.
    const cameraParams = OX.getCameraParameters();
    this.camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
    this.camera.matrixAutoUpdate = false;
    // Add some lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 1);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5);
    directionalLight.position.x = 1;
    directionalLight.position.y = 5;
    directionalLight.position.z = -3;
    this.scene.add(directionalLight);
    // Load the coin
    this.loadCoin();

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
    if (!this.coinTween?.paused() && this.model) {
      this.coinTween = gsap.to(this.model.rotation, { y: time });
    }
    this.render();
    this.animation = requestAnimationFrame(() => this.renderLoop());
  }

  loadCoin() {
    //Coin
    this.gltfLoader.load(
      'assets/coin.glb',
      (model) => {
        this.model = model.scene;
        this.model.rotation.x = -0.5 * Math.PI;
        this.model.scale.set(0.4, 0.4, 0.4);
        this.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.color.set(this.colors.get(this.id));
            child.material.emissiveIntensity = 0.5;
            child.material.needsUpdate = true;
          }
        });

      }
    );
    //Points text
    const textGeometry = new THREE.TextGeometry(
      `+${this.points.get(this.id)!.toString()}`,
      {
        font: new THREE.Font(font),
        height: 5,
        curveSegments: 50,
        bevelEnabled: true,
      }
    );
    textGeometry.center();
    const textMaterial = new THREE.MeshStandardMaterial({
      color: 'gold',
      envMap: this.envMap,
      envMapIntensity: 1.5,
      metalness: 1,
      roughness: 0
    });
    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.scale.x = 0.00001;
    this.textMesh.scale.y = 0.00001;
    this.textMesh.scale.z = 0.00001;
    this.textMesh.rotation.x = -0.65 * Math.PI;
    this.textMesh.position.y = 0.5;
  }
}