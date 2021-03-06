import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  NgZone,
  OnDestroy,
} from "@angular/core";
import * as THREE from "three";
import { ThreePanelService } from "./geometry/three-face.service";

import { SceneService } from "./scene.service";
import { ThreeService } from "./three.service";

@Component({
  selector: "app-three",
  templateUrl: "./three.component.html",
  styleUrls: ["./three.component.scss"],
})
export class ThreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild("myCanvas", { static: true }) private canvasRef!: ElementRef;
  private w: number;
  private h: number;

  constructor(
    private ngZone: NgZone,
    private scene: SceneService,
    private three: ThreeService
  ) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  ngAfterViewInit() {
    this.w = window.innerWidth - 1250;
    document.getElementById("steel-contents").style.display = "flex";
    if (window.innerWidth < 1500) {
      this.w = window.innerWidth - 219;
      document.getElementById("steel-contents").style.display = "block";
    }
    // let h = (w * 9) / 16;
    this.h = window.innerHeight - 120;
    this.scene.OnInit(
      this.getAspectRatio(),
      this.canvas,
      devicePixelRatio,
      this.w,
      this.h
    );

    // レンダリングする
    this.animate();
    this.three.canvasElement = this.canvas;
  }

  ngOnDestroy() {}

  animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener("DOMContentLoaded", () => {
        this.scene.render();
      });
    });
  }

  // マウスクリック時のイベント
  @HostListener("mousedown", ["$event"])
  public onMouseDown(event: MouseEvent) {}

  // マウスクリック時のイベント
  @HostListener("mouseup", ["$event"])
  public onMouseUp(event: MouseEvent) {}

  // マウス移動時のイベント
  @HostListener("mousemove", ["$event"])
  public onMouseMove(event: MouseEvent) {}

  // ウインドウがリサイズした時のイベント処理
  @HostListener("window:resize", ["$event"])
  public onResize(event: Event) {
    this.w = window.innerWidth - 1250;
    document.getElementById("steel-contents").style.display = "flex";

    if (window.innerWidth < 1500) {
      this.w = window.innerWidth - 219;
      document.getElementById("steel-contents").style.display = "block";
    }
    this.h = window.innerHeight - 120;
    this.scene.onResize(this.getAspectRatio(), this.w, this.h);
  }

  private getAspectRatio(): number {
    if (this.canvas.clientHeight === 0) {
      return 0;
    }
    return this.canvas.clientWidth / this.canvas.clientHeight;
    // return this.w / this.h;
  }
}
