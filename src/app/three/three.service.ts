import { Injectable } from "@angular/core";

import { ThreePanelService } from "./geometry/three-face.service";
import { SceneService } from "./scene.service";

@Injectable({
  providedIn: "root",
})
export class ThreeService {
  public mode: string;
  public currentIndex: number = 0;
  public canvasElement: HTMLCanvasElement;

  public selectedNumber: number;

  public canvasWidth: string;
  public canvasHeight: string;

  public fileName: string;

  constructor(private face: ThreePanelService, private scene: SceneService) {}

  //////////////////////////////////////////////////////
  // 初期化
  public OnInit(): void {}

  //////////////////////////////////////////////////////
  // ファイルを開く処理する
  public fileload(): void {
    this.scene.render();
  }

  //////////////////////////////////////////////////////
  // データの変更通知を処理する
  public changeData(mode: string = "", g_id, index: number = 0): void {
    switch (mode) {
      case "steels":
        this.face.max = 0;
        this.face.changeData(g_id);
        break;

      default:
        // 何もしない
        return;
    }

    // 再描画
    this.scene.render();

    this.currentIndex = index;
  }

  public selectChange(mode: string = "", g_id: string, row: number = 0): void {
    switch (mode) {
      case "steels":
        this.face.select = Math.floor(row / 5);
        this.face.changeData(g_id);
        break;

      default:
        // 何もしない
        return;
    }

    // 再描画
    this.scene.render();

    // this.currentIndex = index;
  }
}
