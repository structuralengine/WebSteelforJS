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

  constructor(
    private scene: SceneService,
    private http: HttpClient,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) {
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
      const j = this.helper.toNumber(row["design_point_id"]);
      if (j === null) continue;
      //for (let j = 0; j < data[i].length; j++) {
      // vertexlist.push(data[i][j]);
      vertexlist.push(row);
      if (j % 5 === 0) {
        this.shape(vertexlist /* , data['shape'] */);
        vertexlist = new Array();
      }
    }
  }

  public shape(vertexlist /* , shape: string */): void {
    const shape = vertexlist[0]["shape"];
    // データが有効か確認する
    //const flag = this.getEnableSteel(vertexlist, shape);
    let vertices;

    // if (flag) {
    switch (shape) {
      case "I形":
        vertices = this.getVertices_I(vertexlist);
        this.createPlane(vertices);
        break;
      case "H形":
        vertices = this.getVertices_H(vertexlist);
        this.createPlane(vertices);
        break;
      case "箱形/π形":
        vertices = this.getVertices_box(vertexlist);
        this.createPlane(vertices);
        break;
      case "鋼管":
        vertices = this.getVertices_pipe(vertexlist);
    }
    // }
  }

  private getVertices_I(vertexlist) {
    const vertices = []; // returnする頂点情報

    const scale = 0.1;
    // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
    let b1 =
      vertexlist[0]["steel_b"] !== undefined
        ? vertexlist[0]["steel_b"] * scale
        : 0;
    let h1 =
      vertexlist[0]["steel_h"] !== undefined
        ? vertexlist[0]["steel_h"] * scale
        : 0;
    let w1 =
      vertexlist[0]["steel_w"] !== undefined
        ? vertexlist[0]["steel_w"] * scale
        : 0;
    let b2 =
      vertexlist[1]["steel_b"] !== undefined
        ? vertexlist[1]["steel_b"] * scale
        : 0;
    let h2 =
      vertexlist[1]["steel_h"] !== undefined
        ? vertexlist[1]["steel_h"] * scale
        : 0;

    let b3 =
      vertexlist[2]["steel_b"] !== undefined
        ? vertexlist[2]["steel_b"] * scale
        : 0;
    let h3 =
      vertexlist[2]["steel_h"] !== undefined
        ? vertexlist[2]["steel_h"] * scale
        : 0;
    let w3 =
      vertexlist[2]["steel_w"] !== undefined
        ? vertexlist[2]["steel_w"] * scale
        : 0;

    // 空白セルがあったときの処理
    if (h3 === 0) {
      h3 = h1;
    }
    if (h1 === 0) {
      h1 = h3;
    }
    if (b3 === 0) {
      b3 = b1;
    }
    if (b1 === 0) {
      b1 = b3;
    }
    if (w1 === 0) {
      w1 = b1 / 2;
    }
    if (w3 === 0) {
      w3 = b3 / 2;
    }

    // パターンごとに分岐
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    ////////// 1部材について //////////
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b1, 0, 0));
    list.vertice.push(new THREE.Vector3(b1, -h1, 0));
    list.vertice.push(new THREE.Vector3(0, -h1, 0));
    list.position = new THREE.Vector3(0, 0, 0);

    vertices.push(list); // 頂点情報を追加

    ////////// 2部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b2, 0, 0));
    list.vertice.push(new THREE.Vector3(b2, -h2, 0));
    list.vertice.push(new THREE.Vector3(0, -h2, 0));
    list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);

    vertices.push(list); // 頂点情報を追加

    //////////3部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b3, 0, 0));
    list.vertice.push(new THREE.Vector3(b3, -h3, 0));
    list.vertice.push(new THREE.Vector3(0, -h3, 0));
    list.position = new THREE.Vector3(w1 - w3, -(h1 + h2), 0);

    vertices.push(list); // 頂点情報を追加

    return vertices;
  }

  private getVertices_H(vertexlist) {
    const vertices = []; // returnする頂点情報

    const scale = 0.1;
    // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
    let b1 =
      vertexlist[0]["steel_b"] !== undefined
        ? vertexlist[0]["steel_b"] * scale
        : 0;
    let h1 =
      vertexlist[0]["steel_h"] !== undefined
        ? vertexlist[0]["steel_h"] * scale
        : 0;
    let w1 =
      vertexlist[0]["steel_w"] !== undefined
        ? vertexlist[0]["steel_w"] * scale
        : 0;
    let b2 =
      vertexlist[1]["steel_b"] !== undefined
        ? vertexlist[1]["steel_b"] * scale
        : 0;
    let h2 =
      vertexlist[1]["steel_h"] !== undefined
        ? vertexlist[1]["steel_h"] * scale
        : 0;

    let b3 =
      vertexlist[2]["steel_b"] !== undefined
        ? vertexlist[2]["steel_b"] * scale
        : 0;
    let h3 =
      vertexlist[2]["steel_h"] !== undefined
        ? vertexlist[2]["steel_h"] * scale
        : 0;
    let w3 =
      vertexlist[2]["steel_w"] !== undefined
        ? vertexlist[2]["steel_w"] * scale
        : 0;

    // 空白セルがあったときの処理
    if (h3 === 0) {
      h3 = h1;
    }
    if (h1 === 0) {
      h1 = h3;
    }
    if (b3 === 0) {
      b3 = b1;
    }
    if (b1 === 0) {
      b1 = b3;
    }
    if (w1 === 0) {
      w1 = h1 / 2;
    }
    if (w3 === 0) {
      w3 = h3 / 2;
    }

    // パターンごとに分岐
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    ////////// 1部材について //////////
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b1, 0, 0));
    list.vertice.push(new THREE.Vector3(b1, -h1, 0));
    list.vertice.push(new THREE.Vector3(0, -h1, 0));
    list.position = new THREE.Vector3(0, 0, 0);

    vertices.push(list); // 頂点情報を追加

    ////////// 2部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b2, 0, 0));
    list.vertice.push(new THREE.Vector3(b2, -h2, 0));
    list.vertice.push(new THREE.Vector3(0, -h2, 0));
    list.position = new THREE.Vector3(b1, -w1 + h2 / 2, 0);

    vertices.push(list); // 頂点情報を追加

    //////////3部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b3, 0, 0));
    list.vertice.push(new THREE.Vector3(b3, -h3, 0));
    list.vertice.push(new THREE.Vector3(0, -h3, 0));
    list.position = new THREE.Vector3(b1 + b2, w3 - w1, 0);

    vertices.push(list); // 頂点情報を追加

    return vertices;
  }

  private getVertices_box(vertexlist) {
    const vertices = []; // returnする頂点情報

    const scale = 0.1;
    // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
    let b1 =
      vertexlist[0]["steel_b"] !== undefined
        ? vertexlist[0]["steel_b"] * scale
        : 0;
    let h1 =
      vertexlist[0]["steel_h"] !== undefined
        ? vertexlist[0]["steel_h"] * scale
        : 0;
    let w1 =
      vertexlist[0]["steel_w"] !== undefined
        ? vertexlist[0]["steel_w"] * scale
        : 0;
    let b2 =
      vertexlist[1]["steel_b"] !== undefined
        ? vertexlist[1]["steel_b"] * scale
        : 0;
    let h2 =
      vertexlist[1]["steel_h"] !== undefined
        ? vertexlist[1]["steel_h"] * scale
        : 0;
    let w2 =
      vertexlist[1]["steel_w"] !== undefined
        ? vertexlist[1]["steel_w"] * scale
        : 0;
    let b3 =
      vertexlist[2]["steel_b"] !== undefined
        ? vertexlist[2]["steel_b"] * scale
        : 0;
    let h3 =
      vertexlist[2]["steel_h"] !== undefined
        ? vertexlist[2]["steel_h"] * scale
        : 0;
    let w3 =
      vertexlist[2]["steel_w"] !== undefined
        ? vertexlist[2]["steel_w"] * scale
        : 0;
    let b4 =
      vertexlist[3]["steel_b"] !== undefined
        ? vertexlist[3]["steel_b"] * scale
        : 0;
    let h4 =
      vertexlist[3]["steel_h"] !== undefined
        ? vertexlist[3]["steel_h"] * scale
        : 0;
    let w4 =
      vertexlist[3]["steel_w"] !== undefined
        ? vertexlist[3]["steel_w"] * scale
        : 0;
    let b5 =
      vertexlist[4]["steel_b"] !== undefined
        ? vertexlist[4]["steel_b"] * scale
        : 0;
    let h5 =
      vertexlist[4]["steel_h"] !== undefined
        ? vertexlist[4]["steel_h"] * scale
        : 0;
    let w5 =
      vertexlist[4]["steel_w"] !== undefined
        ? vertexlist[4]["steel_w"] * scale
        : 0;

    // 空白セルがあったときの処理
    if (b3 === 0) {
      b3 = b2;
    }
    if (b2 === 0) {
      b2 = b3;
    }
    if (b4 === 0) {
      b4 = b1;
    }
    if (b1 === 0) {
      b1 = b4;
    }

    if (b3 === 0) {
      b3 = b2;
    }
    if (b2 === 0) {
      b2 = b3;
    }
    if (h3 === 0) {
      h3 = h2;
    }
    if (h2 === 0) {
      h2 = h3;
    }
    if (h4 === 0) {
      h4 = h1;
    }
    if (h1 === 0) {
      h1 = h4;
    }

    if (w3 === 0) {
      w3 = w2;
    }
    if (w2 === 0) {
      w2 = w3;
    }

    if (w1 === 0) {
      w1 = (b1 - w2) / 2;
    }

    // パターンごとに分岐
    const PIflag = w2 > b4 || w3 > b4;

    // 空白セルがあったときの処理
    if (PIflag) {
      if (b5 === 0) {
        b5 = b4;
      }
      if (h5 === 0) {
        h5 = h4;
      }
      if (w4 === 0) {
        w4 = b4 / 2;
      }
      if (w5 === 0) {
        w5 = b5 / 2;
      }
    } else {
      if (w4 === 0) {
        w4 = (b4 - w3) / 2;
      }
    }

    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    ////////// 1部材について //////////
    // h2 !== h3 && PIflag === falseの時、右肩上がり(下がり)になる
    // if (h2 === h3 || PIflag === true) {
    if (h2 === h3) {
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, -h1, 0));
      list.vertice.push(new THREE.Vector3(0, -h1, 0));
      list.position = new THREE.Vector3(0, 0, 0);
    } else {
      // ななめ
      let y = ((h3 - h2) / w2) * b1;
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b1, y, 0));
      list.vertice.push(new THREE.Vector3(b1, y - h1, 0));
      list.vertice.push(new THREE.Vector3(0, -h1, 0));
      list.position = new THREE.Vector3(0, 0, 0);
    }
    vertices.push(list); // 頂点情報を追加

    ////////// 2部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    if (w2 === w3) {
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, -h2, 0));
        list.vertice.push(new THREE.Vector3(0, -h2, 0));
        list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b2;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, y, 0));
        list.vertice.push(new THREE.Vector3(b2, -h2 + y / 2, 0));
        list.vertice.push(new THREE.Vector3(0, -h2 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 - b2 / 2) - h1;
        list.position = new THREE.Vector3(w1 - b2 / 2, y, 0);
      }

      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      // if (h2 === h3) {
      // } else {
      // }
    } else if (w2 < w3) {
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, 0, 0));
        list.vertice.push(new THREE.Vector3(b2 - (w3 - w2) / 2, -h2, 0));
        list.vertice.push(new THREE.Vector3(-(w3 - w2) / 2, -h2, 0));
        list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b2;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, y, 0));
        list.vertice.push(
          new THREE.Vector3(b2 - (w3 - w2) / 2, -h2 + y / 2, 0)
        );
        list.vertice.push(new THREE.Vector3(-(w3 - w2) / 2, -h2 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 - b2 / 2) - h1;
        list.position = new THREE.Vector3(w1 - b2 / 2, y, 0);
      }
    } else {
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, 0, 0));
        list.vertice.push(new THREE.Vector3(b2 + (w2 - w3) / 2, -h2, 0));
        list.vertice.push(new THREE.Vector3((w2 - w3) / 2, -h2, 0));
        list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b2;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, y, 0));
        list.vertice.push(
          new THREE.Vector3(b2 + (w2 - w3) / 2, -h2 + y / 2, 0)
        );
        list.vertice.push(new THREE.Vector3((w2 - w3) / 2, -h2 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 - b2 / 2) - h1;
        list.position = new THREE.Vector3(w1 - b2 / 2, y, 0);
      }
    }
    vertices.push(list); // 頂点情報を追加

    ////////// 3部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    if (w2 === w3) {
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, -h3, 0));
        list.vertice.push(new THREE.Vector3(0, -h3, 0));
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b3;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, y, 0));
        list.vertice.push(new THREE.Vector3(b2, -h3 + y / 2, 0));
        list.vertice.push(new THREE.Vector3(0, -h3 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 + w2 - b3 / 2) - h1;
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, y, 0);
      }
    } else if (w2 < w3) {
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, 0, 0));
        list.vertice.push(new THREE.Vector3(b3 + (w3 - w2) / 2, -h3, 0));
        list.vertice.push(new THREE.Vector3((w3 - w2) / 2, -h3, 0));
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b3;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, y, 0));
        list.vertice.push(
          new THREE.Vector3(b3 + (w3 - w2) / 2, -h3 + y / 2, 0)
        );
        list.vertice.push(new THREE.Vector3((w3 - w2) / 2, -h3 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 + w2 - b3 / 2) - h1;
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, y, 0);
      }
    } else {
      // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
      // 分岐を追加したら、コメントを削除
      if (h2 === h3) {
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, 0, 0));
        list.vertice.push(new THREE.Vector3(b3 - (w2 - w3) / 2, -h3, 0));
        list.vertice.push(new THREE.Vector3(-(w2 - w3) / 2, -h3, 0));
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
      } else {
        let y = ((h3 - h2) / w2) * b3;
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, y, 0));
        list.vertice.push(
          new THREE.Vector3(b3 - (w2 - w3) / 2, -h3 + y / 2, 0)
        );
        list.vertice.push(new THREE.Vector3(-(w2 - w3) / 2, -h3 + y / 2, 0));
        y = ((h3 - h2) / w2) * (w1 + w2 - b3 / 2) - h1;
        list.position = new THREE.Vector3(w1 + w2 - b3 / 2, y, 0);
      }
    }
    vertices.push(list); // 頂点情報を追加

    ////////// 4部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // positionのみ分岐. 1, 2, 3部材の位置によって分岐する
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(b4, 0, 0));
    list.vertice.push(new THREE.Vector3(b4, -h4, 0));
    list.vertice.push(new THREE.Vector3(0, -h4, 0));
    if (PIflag === false) {
      // box型であれば
      if (h2 === h3) {
        list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, -h1 - h2, 0); // パターンA
      } else {
        // 未計算状態. 計算後にコメントを削除
        let y = ((h3 - h2) / w2) * w1 - h1 - h2;
        list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, y, 0); // パターンC
      }
    } else {
      // PI型であれば
      list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, -h1 - h2, 0); // パターンA
    }
    vertices.push(list); // 頂点情報を追加

    if (PIflag) {
      // PI型であれは5部材を設定する
      ////////// 5部材について //////////
      list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
      // w2 === w3の条件で形状が分岐する. 計算式が同じためpositionの分岐は無し.
      list.vertice.push(new THREE.Vector3(0, 0, 0));
      list.vertice.push(new THREE.Vector3(b5, 0, 0));
      list.vertice.push(new THREE.Vector3(b5, -h5, 0));
      list.vertice.push(new THREE.Vector3(0, -h5, 0));
      list.position = new THREE.Vector3(w1 + (w2 + w3) / 2 - w5, -(h1 + h3), 0);
      vertices.push(list); // 頂点情報を追加
    }

    return vertices;
  }

  private getVertices_pipe(vertexlist) {
    const scale = 0.1;
    // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
    const b1 =
      vertexlist[0]["steel_b"] !== undefined
        ? vertexlist[0]["steel_b"] * scale
        : 0;
    const h1 =
      vertexlist[0]["steel_h"] !== undefined
        ? vertexlist[0]["steel_h"] * scale
        : 0;
    const geometry = new THREE.TorusGeometry((b1 - h1) / 2, h1 / 2, 4, 200);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3366cc,
      side: THREE.DoubleSide,
    });
    const torus = new THREE.Mesh(geometry, material);
    this.panel_List.push(torus);
    this.scene.add(torus);
  }

  private getCentroid(child): THREE.Vector3 {
    let Ax: number = 0;
    let Ay: number = 0;
    let Az: number = 0;
    let A: number = 0;
    for (const mesh of child.children) {
      const vertice = mesh.vertice;
      const position = mesh.pos;
      // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
      const ab = new THREE.Vector3(
        vertice[1].x - vertice[0].x,
        vertice[1].y - vertice[0].y,
        vertice[1].z - vertice[0].z
      );
      const ac = new THREE.Vector3(
        vertice[2].x - vertice[0].x,
        vertice[2].y - vertice[0].y,
        vertice[2].z - vertice[0].z
      );
      const ad = new THREE.Vector3(
        vertice[3].x - vertice[0].x,
        vertice[3].y - vertice[0].y,
        vertice[3].z - vertice[0].z
      );
      // meshの三角形Aの重心（centroid1）と、面積（area1）をベクトルから算出
      const centroid1 = new THREE.Vector3(
        (0 + ab.x + ac.x) / 3 + vertice[0].x,
        (0 + ab.y + ac.y) / 3 + vertice[0].y,
        (0 + ab.z + ac.z) / 3 + vertice[0].z
      );
      const area1: number =
        ((ab.y * ac.z - ab.z * ac.y) ** 2 +
          (ab.z * ac.x - ab.x * ac.z) ** 2 +
          (ab.x * ac.y - ab.y * ac.x) ** 2) **
          0.5 /
        2;
      // meshの三角形Bの重心（centroid2）と、面積（area2）をベクトルから算出
      const centroid2 = new THREE.Vector3(
        (0 + ac.x + ad.x) / 3 + vertice[0].x,
        (0 + ac.y + ad.y) / 3 + vertice[0].y,
        (0 + ac.z + ad.z) / 3 + vertice[0].z
      );
      const area2: number =
        ((ac.y * ad.z - ac.z * ad.y) ** 2 +
          (ac.z * ad.x - ac.x * ad.z) ** 2 +
          (ac.x * ad.y - ac.y * ad.x) ** 2) **
          0.5 /
        2;
      // 2つの三角形から, 四角形の重心（centroid0）と面積（area0）を算出し加算する
      const area0 = area1 + area2;
      Ax +=
        ((centroid1.x * area1 + centroid2.x * area2) / area0 + position.x) *
        area0;
      Ay +=
        ((centroid1.y * area1 + centroid2.y * area2) / area0 + position.y) *
        area0;
      Az +=
        ((centroid1.z * area1 + centroid2.z * area2) / area0 + position.z) *
        area0;
      A += area0;
    }
    const centroid = new THREE.Vector3(Ax / A, Ay / A, Az / A);

    return centroid;
  }

  private createPlane(vertices: any) {
    const child = new THREE.Group();
    for (const list of vertices) {
      const points = [];
      for (const num of [0, 1, 2, 0, 2, 3]) {
        points.push(list.vertice[num]);
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.MeshBasicMaterial({
        color: 0x3366cc,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(list.position.x, list.position.y, list.position.z);
      mesh["vertice"] = list.vertice;
      mesh["pos"] = list.position;
      child.add(mesh);
    }
    // 重心位置を算出し、重心位置を原点に移動する
    const centroid: THREE.Vector3 = this.getCentroid(child);
    child.position.set(-centroid.x, -centroid.y, -centroid.z);
    this.panel_List.push(child);
    this.scene.add(child);
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
  private getEnableSteel(vertexlist, shape): boolean {
    // shapeに合わせて、vertexlistの必要行数を変更する
    let until: number;
    if (shape === "I形" || shape === "H形") {
      until = 3;
    } else if (shape === "箱形/π形") {
      until = 1;
    } else if (shape === "鋼管") {
      until = 1;
    } else {
      return false;
    }
    // bとhの情報がなければ、falseでリターンし、描11画を中止する
    let count: number = 1;
    for (const key of Object.keys(vertexlist)) {
      const row = vertexlist[key];
      if (row["steel_b"] == null || row["steel_h"] == null) {
        return false;
      }
      if (count >= until) {
        break;
      } else {
        count += 1;
      }
    }

    // 最後まで通った場合、有効なデータであるため、trueを返す
    return true;
  }
}
