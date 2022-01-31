import { SceneService } from "../scene.service";
import { Injectable } from "@angular/core";

import * as THREE from "three";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { randFloat } from "three/src/math/MathUtils";

@Injectable({
  providedIn: "root",
})
export class ThreePanelService {
  private panel_List: any[];

  private selectionItem: THREE.Object3D; // 選択中のアイテム

  // 大きさを調整するためのスケール
  private scale: number;
  private params: any; // GUIの表示制御
  private gui: any;

  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  constructor(private scene: SceneService, private http: HttpClient) {
    this.panel_List = new Array();

    // gui
    this.scale = 1.0;
    this.params = {
      meshScale: this.scale,
    };
    this.gui = null;
  }

  public changeData(data: any): void {
    //対象のnodeDataを入手
    let vertexlist = [];
    this.ClearData();

    this.x = 0;
    this.y = 0;
    this.z = 0;
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        vertexlist.push(data[i][j]);
        if ((j + 1) % 5 === 0) {
          this.shape(vertexlist);
          vertexlist = new Array();
        }
      }
    }
  }

  public shape(vertexlist): void {
    let shape = vertexlist[0]["shape"];
    switch (shape) {
      case "I形":
        this.createPanel_I(vertexlist);
        break;
      case "H形":
        this.createPanel_H(vertexlist);
        break;
    }
  }

  // 通常のgeometry(buffergeometryではない)
  private createPanel_I(vertexlist): void {
    // this.ClearData();
    // vertexlistの中から必要なデータだけとりたい，かつスケールを変える
    let newList = {};
    for (let i = 1; i <= 3; i++) {
      newList["b" + i] = vertexlist[i - 1]["steel_b"] * 0.1;
      newList["h" + i] = vertexlist[i - 1]["steel_h"] * 0.1;
      newList["w" + i] = vertexlist[i - 1]["steel_w1"] * 0.1;
    }

    // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
    newList["x1"] = newList["b1"] / 2 - newList["w1"];
    newList["x2"] = 0;
    newList["x3"] = newList["b3"] / 2 - newList["w3"];

    newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
    newList["y2"] = 0;
    newList["y3"] = -(newList["h3"] / 2 + newList["h2"] / 2);

    for (let i = 1; i <= 3; i++) {
      // 三次元
      // let geometry = new THREE.BoxBufferGeometry(
      //   newList["b" + i],
      //   newList["h" + i],
      //   50
      // );

      // 二次元
      let geometry = new THREE.PlaneBufferGeometry(
        newList["b" + i],
        newList["h" + i],
        50
      );
      let material = new THREE.MeshBasicMaterial({
        color: 0x8b0000,
        side: THREE.DoubleSide,
        opacity: 0.6,
      });
      let plane = new THREE.Mesh(geometry, material);
      plane.name = "plane";
      plane.position.set(newList["x" + i], newList["y" + i], 0);
      this.scene.add(plane);
      this.panel_List.push(plane);

      // 三次元
      // geometry = new THREE.BoxBufferGeometry();

      // 二次元
      geometry = new THREE.PlaneBufferGeometry();
    }
  }

  private createPanel_H(vertexlist): void {
    // this.ClearData();

    // vertexlistの中から必要なデータだけとりたい，かつスケールを変える
    let newList = {};
    for (let i = 1; i <= 3; i++) {
      newList["b" + i] = vertexlist[i - 1]["steel_b"] * 0.1;
      newList["h" + i] = vertexlist[i - 1]["steel_h"] * 0.1;
      newList["w" + i] = vertexlist[i - 1]["steel_w1"] * 0.1;
    }

    // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
    newList["x1"] = -(newList["b1"] / 2 + newList["b2"] / 2);
    newList["x2"] = 0;
    newList["x3"] = newList["b3"] / 2 + newList["b2"] / 2;

    newList["y1"] = newList["w1"] - newList["h1"] / 2;
    newList["y2"] = 0;
    newList["y3"] = newList["w3"] - newList["h3"] / 2;

    for (let i = 1; i <= 3; i++) {
      // 三次元
      // let geometry = new THREE.BoxBufferGeometry(
      //   newList["b" + i],
      //   newList["h" + i],
      //   50
      // );

      // 二次元
      let geometry = new THREE.PlaneBufferGeometry(
        newList["b" + i],
        newList["h" + i],
        50
      );
      let material = new THREE.MeshBasicMaterial({
        color: 0x8b0000,
        side: THREE.DoubleSide,
        opacity: 0.6,
      });
      let plane = new THREE.Mesh(geometry, material);
      plane.name = "plane";
      plane.position.set(newList["x" + i], newList["y" + i], 0);
      this.scene.add(plane);
      this.panel_List.push(plane);

      // 三次元
      // geometry = new THREE.BoxBufferGeometry();

      // 二次元
      geometry = new THREE.PlaneBufferGeometry();
    }
  }

  // データをクリアする
  public ClearData(): void {
    for (const mesh of this.panel_List) {
      // 文字を削除する
      while (mesh.children.length > 0) {
        const object = mesh.children[0];
        object.parent.remove(object);
      }
      // オブジェクトを削除する
      this.scene.remove(mesh);
    }
    this.panel_List = new Array();
  }
}
