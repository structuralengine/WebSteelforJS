import { Injectable } from "@angular/core";

import { ThreePanelService } from "./geometry/three-face.service";
import { SceneService } from "./scene.service";

@Injectable({
  providedIn: "root",
})
export class ThreeService {
  public mode: string;
  private currentIndex: number;
  public canvasElement: HTMLCanvasElement;

  public selectedNumber: number;

  public canvasWidth: string;
  public canvasHeight: string;

  public fileName: string;

  constructor(
    private face: ThreePanelService,
    private scene: SceneService,
  ) {}

  //////////////////////////////////////////////////////
  // 初期化
  public OnInit(): void {
  }

  //////////////////////////////////////////////////////
  // ファイルを開く処理する
  public fileload(): void {
    this.scene.render();
  }

  //////////////////////////////////////////////////////
  // データの変更通知を処理する
  public changeData(mode: string = "", index: number = 0): void {
    switch (mode) {
      case "steels":
        this.face.changeData(index);
        break;

      default:
        // 何御しない
        return;
    }

    // 再描画
    this.scene.render();

    this.currentIndex = index;
  }

}