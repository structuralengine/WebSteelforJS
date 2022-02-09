import { SceneService } from "../scene.service";
import { Injectable } from "@angular/core";

import * as THREE from "three";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { randFloat } from "three/src/math/MathUtils";
import { InputSteelsService } from "src/app/components/steels/steels.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";

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

  constructor(private scene: SceneService, 
              private http: HttpClient,
              private steel: InputSteelsService, 
              private helper: DataHelperModule) {
    this.panel_List = new Array();

    // gui
    this.scale = 1.0;
    this.params = {
      meshScale: this.scale,
    };
    this.gui = null;
  }

  public changeData(index: number): void {

    const data = this.steel.getSteelJson(index);
    //対象のnodeDataを入手
    let vertexlist = [];
    this.ClearData();

    this.x = 0;
    this.y = 0;
    this.z = 0;
    let i: number = 0;
    // for (let i = 0; i < data.length; i++) {
    for (const i of Object.keys(data)) {
      const row = data[i];
      const j = this.helper.toNumber(row['design_point_id']);
      if (j === null) continue;
      //for (let j = 0; j < data[i].length; j++) {
        // vertexlist.push(data[i][j]);
        vertexlist.push(row);
        if (j % 5 === 0) {
          this.shape(vertexlist/* , data['shape'] */);
          vertexlist = new Array();
        }
    }
  }

  public shape(vertexlist/* , shape: string */): void {
    const shape = vertexlist[0]["shape"];
    // データが有効か確認する
    const flag = this.getEnableSteel(vertexlist, shape);
    if (flag) {
      switch (shape) {
        case "I形":
          this.createPanel_I(vertexlist);
          break;
        case "H形":
          this.createPanel_H(vertexlist);
          break;
        case "箱形/π形":
          this.createPanel_box(vertexlist);
      }
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
      newList["w" + i] = vertexlist[i - 1]["steel_w"] * 0.1;
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
      newList["w" + i] = vertexlist[i - 1]["steel_w"] * 0.1;
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

  private createPanel_box(vertexlist): void {
    // this.ClearData();// memo: list[0～4]でkeyはsteel_b, steel_h, steel_w

    // 四角形の頂点を回収する
    const vertices = this.getBoxVertices(vertexlist);
    
    const child = new THREE.Group();
    for (const list of vertices) {
      const points = [];
      // for (let num = 0; num < list.length - 1; num++) {
      for (const num of [0, 1, 2, 0, 2, 3]) {
        points.push(list.vertice[num])
      };
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.MeshBasicMaterial({
        color: 0x3366cc,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(list.position.x, list.position.y, list.position.z);
      mesh['vertice'] = list.vertice;
      mesh['pos'] = list.position;
      child.add(mesh);
    }
    const centroid: THREE.Vector3 = this.getCentroid(child);
    child.position.set(centroid.x, centroid.y, centroid.z);// ここに重心位置を採用。(centroid.x, centroid.y, centroid.z)と置く
    this.panel_List.push(child);
    this.scene.add(child);


    // vertexlistの中から必要なデータだけとりたい，かつスケールを変える
    // let newList = {};
    // for (let i = 1; i <= 5; i++) {
    //   let secret = i - 2;
    //   newList["b" + i] =
    //     vertexlist[i - 1]["steel_b"] == void 0
    //       ? newList["b" + secret]
    //       : vertexlist[i - 1]["steel_b"] * 0.1;
    //   newList["h" + i] =
    //     vertexlist[i - 1]["steel_h"] == void 0
    //       ? newList["h" + secret]
    //       : vertexlist[i - 1]["steel_h"] * 0.1;
    //   newList["w" + i] =
    //     vertexlist[i - 1]["steel_w1"] == void 0
    //       ? newList["w" + secret]
    //       : vertexlist[i - 1]["steel_w"] * 0.1;
    // }

    // let w2 = newList["w2"];
    // let b3 = newList["b3"];

    // let PIflg = w2 < b3 ? false : true;
    // let boxJud = PIflg == false ? 4 : 5;
    // let diago = false;

    // newList["x1"] = 0;
    // newList["x2"] = -(newList["b1"] / 2 - newList["w1"]);
    // newList["x3"] = newList["b3"] / 2 - newList["w3"] - newList["w2"] / 2;
    // newList["x3"] = newList["x2"] + newList["b3"] / 2 - newList["w3"];
    // newList["x4"] = newList["x2"] + newList["w2"];
    // newList["x5"] = newList["x4"] + newList["b5"] / 2 - newList["w5"];

    // if (newList["b1"] <= newList["w2"]) {
    //   newList["y1"] = newList["h2"] / 2 - newList["h1"] / 2;
    // } else {
    //   newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
    // }
    // newList["y2"] = 0;
    // newList["y3"] = -(newList["h2"] / 2 + newList["h3"] / 2);
    // if (PIflg == false) {
    //   newList["y4"] = -(newList["h2"] / 2 - newList["h4"] / 2);
    //   const points = [];
    //   if (newList["h2"] !== newList["h4"]) {
    //     let x1 = newList["x2"] + newList["b2"] / 2;
    //     let y1 = newList["y2"] + newList["h2"] / 2;
    //     let x2 = newList["x4"] - newList["b4"] / 2;
    //     let y2 = newList["y4"] + newList["h4"] / 2;
    //     let x3 = x1;
    //     let y3 = y1 - newList["h1"];
    //     let x4 = x2;
    //     let y4 = y2 - newList["h1"];

        // const geometry2 = new THREE.PlaneGeometry(20, 20, 1, 1);
        // points.push(new THREE.Vector3(x1, y1, 0));
        // points.push(new THREE.Vector3(x2, y2, 0));
        // points.push(new THREE.Vector3(x3, y3, 0));
        // points.push(new THREE.Vector3(x2, y2, 0));
        // points.push(new THREE.Vector3(x4, y4, 0));
        // points.push(new THREE.Vector3(x3, y3, 0));

        // var material = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
        // const points = [];
        // for (const p of vertex) {
        //   points.push(new THREE.Vector3(p[0], p[1], p[2]));
        // }
        // var geometry = new THREE.BufferGeometry().setFromPoints(points);
        // const mesh = new THREE.Mesh(geometry, material);
        // this.panel_List.push(mesh);
        // this.scene.add(mesh);
        // diago = true;
        // var geometry = new THREE.BufferGeometry().setFromPoints(points);

        // var shape = new THREE.Shape(points);
        // const material = new THREE.MeshBasicMaterial({
        //   color: 0x3366cc,
        //   side: THREE.DoubleSide,
        // });
        // const mesh = new THREE.Mesh(geometry, material);
        // this.panel_List.push(mesh);
        // this.scene.add(mesh);
      // }
    // } else {
    //   newList["y4"] = newList["h2"] / 2 - newList["h4"] / 2;
    // }
    // newList["y5"] = newList["y4"] - newList["h4"] / 2 - newList["h5"] / 2;

    // for (let i = diago ? 2 : 1; i <= boxJud; i++) {
      // 三次元
      // let geometry = new THREE.BoxBufferGeometry(
      //   newList["b" + i],
      //   newList["h" + i],
      //   50
      // );

      // 二次元
    //   let geometry = new THREE.PlaneBufferGeometry(
    //     newList["b" + i],
    //     newList["h" + i],
    //     1,
    //     1
    //   );
    //   let material = new THREE.MeshBasicMaterial({
    //     color: 0x8b0000,
    //     side: THREE.DoubleSide,
    //     opacity: 0.6,
    //   });
    //   let plane = new THREE.Mesh(geometry, material);
    //   plane.name = "plane";
    //   plane.position.set(newList["x" + i], newList["y" + i], 0);
    //   this.scene.add(plane);
    //   this.panel_List.push(plane);

      // 三次元
      // geometry = new THREE.BoxBufferGeometry();

      // 二次元
    //   geometry = new THREE.PlaneBufferGeometry();

      // if (w2 < b3) {
      //   this.shapeOfBox(newList);
      // } else {
      //   this.shapeOfPi(newList);
      // }
    // }
  }
  private getBoxVertices(vertexlist){
    
    const vertices = []; // returnする頂点情報

    const scale = 0.1;
    // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
    const b1 = (vertexlist[0]['steel_b'] !== undefined) ? vertexlist[0]['steel_b'] * scale : 0;
    const h1 = (vertexlist[0]['steel_h'] !== undefined) ? vertexlist[0]['steel_h'] * scale : 0;
    const w1 = (vertexlist[0]['steel_w'] !== undefined) ? vertexlist[0]['steel_w'] * scale : 0;
    const b2 = (vertexlist[1]['steel_b'] !== undefined) ? vertexlist[1]['steel_b'] * scale : 0;
    const h2 = (vertexlist[1]['steel_h'] !== undefined) ? vertexlist[1]['steel_h'] * scale : 0;
    const w2 = (vertexlist[1]['steel_w'] !== undefined) ? vertexlist[1]['steel_w'] * scale : 0;
    const b3 = (vertexlist[2]['steel_b'] !== undefined) ? vertexlist[2]['steel_b'] * scale : 0;
    const h3 = (vertexlist[2]['steel_h'] !== undefined) ? vertexlist[2]['steel_h'] * scale : 0;
    const w3 = (vertexlist[2]['steel_w'] !== undefined) ? vertexlist[2]['steel_w'] * scale : 0;
    const b4 = (vertexlist[3]['steel_b'] !== undefined) ? vertexlist[3]['steel_b'] * scale : 0;
    const h4 = (vertexlist[3]['steel_h'] !== undefined) ? vertexlist[3]['steel_h'] * scale : 0;
    const w4 = (vertexlist[3]['steel_w'] !== undefined) ? vertexlist[3]['steel_w'] * scale : 0;
    const b5 = (vertexlist[4]['steel_b'] !== undefined) ? vertexlist[4]['steel_b'] * scale : 0;
    const h5 = (vertexlist[4]['steel_h'] !== undefined) ? vertexlist[4]['steel_h'] * scale : 0;
    const w5 = (vertexlist[4]['steel_w'] !== undefined) ? vertexlist[4]['steel_w'] * scale : 0;

    // パターンごとに分岐
    const PIflag = (w2 > b4 || w3 > b4);
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }
    ////////// 1部材について //////////
    // h2 !== h3 && PIflag === falseの時、右肩上がり(下がり)になる
    if (h2 === h3 || PIflag === true) {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, -h1, 0));
      list.vertice.push(new THREE.Vector3(0, -h1, 0));
      list.position = new THREE.Vector3(0, 0, 0);
    } else {
      // 未計算状態
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, -h1, 0));
      list.vertice.push(new THREE.Vector3(0, -h1, 0));
      list.position = new THREE.Vector3(0, 0, 0);
    }
    vertices.push(list);  // 頂点情報を追加

    ////////// 2部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    if (w2 === w3) {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b2, 0, 0));
      list.vertice.push(new THREE.Vector3(b2, -h2, 0));
      list.vertice.push(new THREE.Vector3(0, -h2, 0));
      list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
    } else if (w2 < w3){
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b2, 0, 0));
      list.vertice.push(new THREE.Vector3(b2 - (w3-w2)/2, -h2, 0));
      list.vertice.push(new THREE.Vector3(-(w3-w2)/2, -h2, 0));
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
    } else {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b2, 0, 0));
      list.vertice.push(new THREE.Vector3(b2 + (w2-w3)/2, -h2, 0));
      list.vertice.push(new THREE.Vector3((w2-w3)/2, -h2, 0));
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
    }
    vertices.push(list);  // 頂点情報を追加

    ////////// 3部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    if (w2 === w3) {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b3, 0, 0));
      list.vertice.push(new THREE.Vector3(b3, -h3, 0));
      list.vertice.push(new THREE.Vector3(0, -h3, 0));
      list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
    } else if (w2 < w3){
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b3, 0, 0));
      list.vertice.push(new THREE.Vector3(b3 + (w3-w2)/2, -h3, 0));
      list.vertice.push(new THREE.Vector3((w3-w2)/2, -h3, 0));
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
    } else {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b3, 0, 0));
      list.vertice.push(new THREE.Vector3(b3 - (w2-w3)/2, -h3, 0));
      list.vertice.push(new THREE.Vector3(-(w2-w3)/2, -h3, 0));
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
    }
    vertices.push(list);  // 頂点情報を追加

    ////////// 4部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // positionのみ分岐. 1, 2, 3部材の位置によって分岐する
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b4, 0, 0));
    list.vertice.push(new THREE.Vector3(b4, -h4, 0));
    list.vertice.push(new THREE.Vector3(0, -h4, 0));
    if (PIflag === false) { // box型であれば
      if (h2 === h3) {
        list.position = new THREE.Vector3(w1 + (w2-w3)/2 - w4, -h1-h2, 0);  // パターンA
      } else if (h2 > h3) {
        // 未計算状態. 計算後にコメントを削除
        list.position = new THREE.Vector3(w1 - w4, -h1-h2, 0);  // パターンB
      } else {
        // 未計算状態. 計算後にコメントを削除
        list.position = new THREE.Vector3(w1 - w4, -h1-h2, 0);  // パターンC
      }
    } else {  // PI型であれば
      list.position = new THREE.Vector3(w1 + (w2-w3)/2 - w4, -h1-h2, 0);  // パターンA
    }
    vertices.push(list);  // 頂点情報を追加

    if (PIflag) { // PI型であれは5部材を設定する
      ////////// 5部材について //////////
      list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
      // w2 === w3の条件で形状が分岐する. 計算式が同じためpositionの分岐は無し.
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b5, 0, 0));
      list.vertice.push(new THREE.Vector3(b5, -h5, 0));
      list.vertice.push(new THREE.Vector3(0, -h5, 0));
      list.position = new THREE.Vector3( w1 + (w2 + w3)/2 - w5, -(h1+h3), 0 );
    }

    return vertices;
  }

  private getCentroid(child): THREE.Vector3 {

    let centroid = new THREE.Vector3(3, 5, 0);
    for (const mesh of child.children) {
      const vertice = mesh.vertice;
      const position = mesh.pos;
    }

    return centroid
    
  }

  private shapeOfBox(newList): void {
    // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
    newList["x1"] = 0;
    newList["x2"] = -(newList["b1"] / 2 - newList["w1"]);
    // newList["x3"] = newList["b3"] / 2 - newList["w3"] - newList["w2"] / 2;
    newList["x3"] = newList["x2"] + newList["b3"] / 2 - newList["w3"];

    newList["x4"] = newList["x2"] + newList["w2"];

    if (newList["b1"] == newList["w2"]) {
      newList["y1"] = newList["h2"] / 2 - newList["h1"] / 2;
    } else {
      newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
    }
    newList["y2"] = 0;
    newList["y3"] = -(newList["h2"] / 2 + newList["h3"] / 2);
    newList["y4"] = newList["h2"] / 2 - newList["h4"] / 2;

    for (let i = 1; i <= 4; i++) {
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

  private shapeOfPi(newList): void {
    // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
    newList["x1"] = 0;
    newList["x2"] = -(newList["b1"] / 2 - newList["w1"]);
    newList["x3"] = newList["x2"] + newList["b3"] / 2 - newList["w3"];
    newList["x4"] = newList["x2"] + newList["w2"];
    newList["x5"] = newList["x4"] + newList["b5"] / 2 - newList["w5"];

    if (newList["b1"] == newList["w2"]) {
      newList["y1"] = newList["h2"] / 2 - newList["h1"] / 2;
    } else {
      newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
    }
    newList["y2"] = 0;
    newList["y3"] = -(newList["h2"] / 2 + newList["h3"] / 2);
    newList["y4"] = newList["h2"] / 2 - newList["h4"] / 2;
    newList["y5"] = newList["y4"] - newList["h4"] / 2 - newList["h5"] / 2;

    for (let i = 1; i <= 5; i++) {
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

  // 有効な行かどうか確認する
  private getEnableSteel(vertexlist, shape) :boolean{

    // shapeに合わせて、vertexlistの必要行数を変更する
    let until: number;
    if (shape === 'I形' || shape === 'H形') {
      until = 3;
    } else if (shape === '箱形/π形') {
      until = 4;
    } else {
      return false;
    }
    // bとhの情報がなければ、falseでリターンし、描画を中止する
    let count: number = 1;
    for (const key of Object.keys(vertexlist)) {
      const row = vertexlist[key];
      if (row['steel_b'] == null || row['steel_h'] == null) {
        return false;
      }
      if (count >= until) {
        break;
      } else {
        count += 1;
      }
    }

    // 最後まで通った場合、有効なデータであるため、trueを返す
    return true 
  }
}
