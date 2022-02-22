import { Injectable } from "@angular/core";
import { InputBarsService } from "src/app/components/bars/bars.service";
import { InputSteelsService } from "src/app/components/steels/steels.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import * as THREE from "three";
import { environment } from "src/environments/environment";
import { SetParamService } from "./set-param.service";
@Injectable({
  providedIn: "root",
})
export class SetIService {
  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule,
    private param: SetParamService
  ) {}
  // 矩形断面の POST 用 データ作成
  public getI(
    target: string,
    member: any,
    index: number,
    side: string,
    safety: any,
    option: any
  ): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getShape(member, target, index, side, safety, option);
    // const h: number = shape.H;
    // const b: number = shape.B;

    // const section = {
    //   Height: h, // 断面高さ
    //   WTop: b, // 断面幅（上辺）
    //   WBottom: b, // 断面幅（底辺）
    //   ElasticID: "c", // 材料番号
    // };
    // result.Concretes.push(section);
    result["member"] = shape;

    // result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    return result;
  }

  public getSection(member: any, target: string, index: number) {
    const result = {
      // H: null,
      // B: null,
      // Bt: null,
      // t: null,
      // tan: null,
      member: null,
    };

    return result;
  }

  public getShape(
    member: any,
    target: string,
    index: number,
    side: string,
    safety: any,
    option: any
  ): any {
    const result = this.getSection(member, target, index);

    // const stl: any = this.steel.getCalcData(index); // 鉄骨
    let stl = {};
    const steelData = this.steel.getSteelJson(member.g_no);
    for (let n = 0; n < steelData.length; n++) {
      const row = steelData[n];
      if (row.index === undefined) continue;
      if (row.index === index) {
        stl[1] = steelData[n + 0];
        stl[2] = steelData[n + 1];
        stl[3] = steelData[n + 2];
        stl[4] = steelData[n + 3];
        stl[5] = steelData[n + 4];
        break;
      }
    }

    // こっちでelementを独自に作る
    let vertexlist = {};
    for (const i of Object.keys(stl)) {
      if (this.helper.toNumber(i) == null) continue;
      const row = stl[i];
      // const j = this.helper.toNumber(row["design_point_id"]);
      // if (j === null) continue;
      // for (let j = 0; j < data[i].length; j++) {
      // vertexlist.push(data[i][j]);
      // vertexlist["shape"] = row["shape"];
      vertexlist["steel_b" + String(i)] =
        row["steel_b"] == void 0 || null ? 0 : row["steel_b"];
      vertexlist["steel_h" + String(i)] =
        row["steel_h"] == void 0 || null ? 0 : row["steel_h"];
      vertexlist["steel_w" + String(i)] =
        row["steel_w"] == void 0 || null ? 0 : row["steel_w"];
      vertexlist["lib_b" + String(i)] =
        row["lib_b"] == void 0 || null ? 0 : row["lib_b"];
      vertexlist["lib_h" + String(i)] =
        row["lib_h"] == void 0 || null ? 0 : row["lib_h"];
      vertexlist["lib_w" + String(i)] =
        row["lib_w"] == void 0 || null ? 0 : row["lib_w"];
      vertexlist["lib_n" + String(i)] =
        row["lib_n"] == void 0 || null ? 0 : row["lib_n"];
    }
    // 腐食しろがあるときはここで処理する
    /* if (true) {
      vertexlist["steel_h1"] -= 1
    } */
    const vertices = this.getVertices(vertexlist);
    const centroid = this.param.getCentroid(vertices);
    const param = this.param.getSectionParam(vertices, centroid);

    // steel
    const steel = {
      A: null,
      Ix: null,
      Iy: null,
      rs: null,
    };
    for (const num of Object.keys(stl)) {
      const n = this.helper.toNumber(num);
      if (n !== null) {
        steel[n] = {
          title: stl[num].title,
          steel_b: vertexlist["steel_b" + String(n)],
          steel_h: vertexlist["steel_h" + String(n)],
          steel_w: vertexlist["steel_w" + String(n)],
          lib_b: vertexlist["lib_b" + String(n)],
          lib_h: vertexlist["lib_h" + String(n)],
          lib_w: vertexlist["lib_w" + String(n)],
          lib_n: vertexlist["lib_n" + String(n)],
          // fsy: 235, // 235ではなく厚さに応じた鉄骨強度
          // this.helper.getFsyk2(thickness: number, material_steel: any)
        };
        const fsy_key = (n === 1 || n === 3) ? "steel_h" + String(n) : "steel_b" + String(n);
        steel[n]['fsy'] = this.helper.getFsyk2( vertexlist[fsy_key], safety.material_steel);
      }
    }
    const dim = {
      Afgu: vertexlist["steel_b1"] * vertexlist["steel_h1"], 
      Afnu: vertexlist["steel_b1"] * vertexlist["steel_h1"], 
      Afgl: vertexlist["steel_b3"] * vertexlist["steel_h3"], 
      Afnl: vertexlist["steel_b3"] * vertexlist["steel_h3"], 
      Aw: vertexlist["steel_b2"] * vertexlist["steel_h2"], 
      yc: 0 - centroid.y,
      yt: vertexlist["steel_h1"] + vertexlist["steel_h2"] + vertexlist["steel_h3"] + centroid.y,
    }

    steel["A"] = param.A;
    steel["Ix"] = param.Ix;
    steel["Iy"] = param.Iy;
    steel["dim"] = dim;
    steel["rs"] = safety.safety_factor.S_rs;

    result["steel"] = steel;

    return result;
  }

  public getVertices(element) {
    const vertices = []; // returnする頂点情報

    // 空白セルがあったときの処理
    if (element["steel_h3"] === 0) {
      element["steel_h3"] = element["steel_h1"];
    }
    if (element["steel_h1"] === 0) {
      element["steel_h1"] = element["steel_h3"];
    }
    if (element["steel_b3"] === 0) {
      element["steel_b3"] = element["steel_b1"];
    }
    if (element["steel_b1"] === 0) {
      element["steel_b1"] = element["steel_b3"];
    }
    if (element["steel_w1"] === 0) {
      element["steel_w1"] = element["steel_b1"] / 2;
    }
    if (element["steel_w3"] === 0) {
      element["steel_w3"] = element["steel_b3"] / 2;
    }

    // パターンごとに分岐
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    ////////// 1部材について //////////
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(element["steel_b1"], 0, 0));
    list.vertice.push(
      new THREE.Vector3(element["steel_b1"], -element["steel_h1"], 0)
    );
    list.vertice.push(new THREE.Vector3(0, -element["steel_h1"], 0));
    list.position = new THREE.Vector3(0, 0, 0);

    vertices.push(list); // 頂点情報を追加

    ////////// 2部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(element["steel_b2"], 0, 0));
    list.vertice.push(
      new THREE.Vector3(element["steel_b2"], -element["steel_h2"], 0)
    );
    list.vertice.push(new THREE.Vector3(0, -element["steel_h2"], 0));
    list.position = new THREE.Vector3(
      element["steel_w1"] - element["steel_b2"] / 2,
      -element["steel_h1"],
      0
    );

    vertices.push(list); // 頂点情報を追加

    //////////3部材について //////////
    list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    list.vertice.push(new THREE.Vector3(0, 0, 0));
    list.vertice.push(new THREE.Vector3(element["steel_b3"], 0, 0));
    list.vertice.push(
      new THREE.Vector3(element["steel_b3"], -element["steel_h3"], 0)
    );
    list.vertice.push(new THREE.Vector3(0, -element["steel_h3"], 0));
    list.position = new THREE.Vector3(
      element["steel_w1"] - element["steel_w3"],
      -(element["steel_h1"] + element["steel_h2"]),
      0
    );

    vertices.push(list); // 頂点情報を追加

    return vertices;
  }

}