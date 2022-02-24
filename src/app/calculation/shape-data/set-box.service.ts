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
export class SetBoxService {
  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule,
    private param: SetParamService
  ) {}

  // 矩形断面の POST 用 データ作成
  public getBox(
    target: string,
    member: any,
    index: number,
    side: string,
    safety: any,
    option: any
  ): any {
    const result = { symmetry: true, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getBoxShape(member, target, index, side, safety, option);
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

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsection(
    target: string,
    member: any,
    index: number,
    side: string,
    safety: any,
    option: any
  ): object {
    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(
      member,
      target,
      index,
      side,
      safety,
      option
    );
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: "c",
    };
    result.Concretes.push(section1);

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: "c",
    };
    result.Concretes.push(section2);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計
    // const result2 = this.getRectBar(shape, safety, side);
    // for (const key of Object.keys(result2)) {
    //   result[key] = result2[key];
    // }

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getInvertedTsection(
    target: string,
    member: any,
    index: number,
    side: string,
    safety: any,
    option: any
  ): object {
    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(
      member,
      target,
      index,
      side,
      safety,
      option
    );
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: "c",
    };
    result.Concretes.push(section2);

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: "c",
    };
    result.Concretes.push(section1);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計
    // const result2 = this.getRectBar(shape, safety, side);
    // for (const key of Object.keys(result2)) {
    //   result[key] = result2[key];
    // }

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

  public getTSection(member: any, target: string, index: number) {
    const result = this.getSection(member, target, index);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    // if (bf === null) {
    //   bf = result.B;
    // }
    // if (hf === null) {
    //   hf = result.H;
    // }
    result["Bt"] = bf;
    result["t"] = hf;

    return result;
  }

  // 断面の幅と高さ（フランジ幅と高さ）を取得する
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getBoxShape(
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
    const vertices = this.getVertices_box(vertexlist);
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
        };
        const fsy_key =
          n === 1 || n === 3 ? "steel_h" + String(n) : "steel_b" + String(n);
        steel[n]["fsy"] = this.helper.getFsyk2(
          vertexlist[fsy_key],
          safety.material_steel
        );
      }
    }

    /* if (Object.keys(stl).length !== 0) {
      // steel.rs = safety.safety_factor.S_rs;

      // 1~5を入手
      for (const num of Object.keys(steel)) {
        // if (num === "rs" || num === "A" || num === "Ix" || num === "Iy" ) continue;
        const steel0 = steel[num];
        for (const key of ["steel_b", "steel_h", "steel_w"]) {
          steel0[key] = stl[num][key];
        }
        // 鉄骨強度を入手し, fsyに入れる
        // steel0['fsy'] = this.helper.getFsyk2(stl[num]upper_thickness, safety.material_steel);
        steel0["fsy"] = 235; // 鉄骨幅は部材ナンバーごとに異なるため、一旦保留
      }
    } */
    const dim = {
      Afgu: vertexlist["steel_b1"] * vertexlist["steel_h1"],
      Afnu: vertexlist["steel_b1"] * vertexlist["steel_h1"],
      Afgl: vertexlist["steel_b4"] * vertexlist["steel_h4"],
      Afnl: vertexlist["steel_b4"] * vertexlist["steel_h4"],
      Aw:
        vertexlist["steel_b2"] * vertexlist["steel_h2"] +
        vertexlist["steel_b3"] * vertexlist["steel_h3"],
      yc: 0 - centroid.y,
      yt:
        vertexlist["steel_h1"] +
        vertexlist["steel_h2"] +
        vertexlist["steel_h4"] +
        centroid.y,
    };
    steel["A"] = param.A;
    steel["Ix"] = param.Ix;
    steel["Iy"] = param.Iy;
    steel["dim"] = dim;
    steel["rs"] = safety.safety_factor.S_rs;

    result["steel"] = steel;

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsectionShape(
    member: any,
    target: string,
    index: number,
    side: string,
    safety: any,
    option: any
  ): any {
    const result = this.getBoxShape(
      member,
      target,
      index,
      side,
      safety,
      option
    );

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) {
      bf = result.B;
    }
    if (hf === null) {
      hf = result.H;
    }
    result["Bt"] = bf;
    result["t"] = hf;

    return result;
  }

  // 矩形、Ｔ形断面における 鉄骨情報を生成する関数
  private getSteel(section: any, side: string): any {
    const result = {
      Steels: new Array(),
      SteelElastic: new Array(),
    };

    let defaultID = "st";

    // I 鉄骨の入力 ---------------------------------------------------
    const I: any = {
      UpperT: section.steel.I.compress_thickness,
      UpperW: section.steel.I.compress_width,
      BottomT: section.steel.I.tension_thickness,
      BottomW: section.steel.I.tension_width,
      WebT: section.steel.I.web_thickness,
      WebH: section.steel.I.web_height,
    };

    let I_flag = false;
    for (const key of Object.keys(I)) {
      const value = this.helper.toNumber(I[key]);
      if (value === null) {
        I[key] = 0;
      } else {
        I_flag = true;
      }
    }
    if (I_flag === true) {
      I["Df"] = this.helper.toNumber(section.steel.I.position);
      if (I["Df"] === null) {
        I["Df"] = 0;
      }

      const sectionI = [];

      // かぶり部分
      if (I.Df > 0) {
        // 最初の1つめ の鉄骨材料を登録する
        for (const fsy of [
          section.steel.I.fsy_tension.fsy,
          section.steel.I.fsy_compress.fsy,
          section.steel.I.fsy_web.fsy,
          section.steel.H.fsy_left.fsy,
          section.steel.H.fsy_right.fsy,
          section.steel.H.fsy_web.fsy,
        ]) {
          if (this.helper.toNumber(fsy) !== null) {
            result.SteelElastic.push({
              ElasticID: defaultID,
              Es: 200,
              fsk: section.steel.I.fsy_tension.fsy,
              rs: section.steel.rs,
            });
            break;
          }
        }
        sectionI.push({
          Height: I.Df, // 断面高さ
          WTop: 0, // 断面幅（上辺）
          WBottom: 0, // 断面幅（底辺）
          ElasticID: defaultID, // 材料番号
        });
      }

      // 圧縮側フランジ
      if (result.SteelElastic.length === 0) defaultID = "sc";
      if (I.UpperT > 0) {
        const fsk = section.steel.I.fsy_compress.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.UpperT, // 断面高さ
          WTop: I.UpperW, // 断面幅（上辺）
          WBottom: I.UpperW, // 断面幅（底辺）
          ElasticID,
        });
      }

      // 腹板
      if (result.SteelElastic.length === 0) defaultID = "sw";
      if (I.WebH > 0) {
        const fsk = section.steel.I.fsy_web.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.WebH, // 断面高さ
          WTop: I.WebT, // 断面幅（上辺）
          WBottom: I.WebT, // 断面幅（底辺）
          ElasticID: ElasticID, // 材料番号
        });
      }

      // 引張側フランジ
      if (result.SteelElastic.length === 0) defaultID = "st";
      if (I.BottomT > 0) {
        const fsk = section.steel.I.fsy_tension.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.BottomT, // 断面高さ
          WTop: I.BottomW, // 断面幅（上辺）
          WBottom: I.BottomW, // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true,
        });
      }

      result.Steels.push(sectionI);
    }

    // H 鉄骨の入力 ---------------------------------------------------
    const H: any = {
      LeftT: section.steel.H.left_thickness,
      LeftW: section.steel.H.left_width,
      RightT: section.steel.H.right_thickness,
      RightW: section.steel.H.right_width,
      WebT: section.steel.H.web_thickness,
      WebH: section.steel.H.web_height - I.WebT,
    };
    let H_flag = false;

    for (const key of Object.keys(H)) {
      const value = this.helper.toNumber(H[key]);
      if (value === null) {
        H[key] = 0;
      } else {
        H_flag = true;
      }
    }
    if (H_flag === true) {
      const Df = this.helper.toNumber(section.steel.H.position);
      if (Df === null) {
        H["LeftDf"] = 0;
        H["RightDf"] = 0;
      } else {
        H["LeftDf"] = Df;
        H["RightDf"] = Df;
      }
      const sectionHeight = section.H; // 断面高さ

      if (H.LeftW > H.RightW) {
        H.RightDf += (H.LeftW - H.RightW) / 2;
        H.WebDf = H.RightDf + (H.RightW - H.WebT) / 2;
      } else {
        H.LeftDf += (H.RightW - H.LeftW) / 2;
        H.WebDf = H.LeftDf + (H.LeftW - H.WebT) / 2;
      }
      if (side === "上側引張") {
        H.WebDf = sectionHeight - H.WebDf;
      }

      // H 鉄骨の左側フランジ ---------------------------------------------------
      if (result.SteelElastic.length === 0) defaultID = "sl";
      const HsectionLeft = [];
      if (H.LeftT > 0) {
        // かぶり部分
        if (H.LeftDf > 0) {
          HsectionLeft.push({
            Height: H.LeftDf, // 断面高さ
            WTop: 0, // 断面幅（上辺）
            WBottom: 0, // 断面幅（底辺）
            ElasticID: defaultID, // 材料番号
          });
        }
        // 材料
        const fsk = section.steel.H.fsy_left.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: defaultID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 左フランジ
        HsectionLeft.push({
          Height: H.LeftW, // 断面高さ
          WTop: H.LeftT, // 断面幅（上辺）
          WBottom: H.LeftT, // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true,
        });
        result.Steels.push(HsectionLeft);
      }
      // H 鉄骨の右側フランジ ---------------------------------------------------
      if (result.SteelElastic.length === 0) defaultID = "sr";
      const HsectionRight = [];
      if (H.RightT > 0) {
        // かぶり部分
        if (H.RightDf > 0) {
          HsectionRight.push({
            Height: H.RightDf, // 断面高さ
            WTop: 0, // 断面幅（上辺）
            WBottom: 0, // 断面幅（底辺）
            ElasticID: defaultID, // 材料番号
          });
        }
        // 材料
        const fsk = section.steel.H.fsy_right.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 右フランジ
        HsectionRight.push({
          Height: H.RightW, // 断面高さ
          WTop: H.RightT, // 断面幅（上辺）
          WBottom: H.RightT, // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true,
        });
        result.Steels.push(HsectionRight);
      }
      // H 鉄骨のウェブ ----------------------------------------------------------
      if (result.SteelElastic.length === 0) defaultID = "sw";
      const HsectionWeb = [];
      if (H.WebT > 0) {
        // かぶり部分
        if (H.WebDf > 0) {
          HsectionWeb.push({
            Height: H.WebDf, // 断面高さ
            WTop: 0, // 断面幅（上辺）
            WBottom: 0, // 断面幅（底辺）
            ElasticID: defaultID, // 材料番号
          });
        }
        // 材料
        const fsk = section.steel.H.fsy_web.fsy;
        const e = result.SteelElastic.find((v) => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs,
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // ウェブ
        HsectionWeb.push({
          Height: H.WebT, // 断面高さ
          WTop: H.WebH, // 断面幅（上辺）
          WBottom: H.WebH, // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true,
        });
        result.Steels.push(HsectionWeb);
      }
    }
    return result;
  }

  public getVertices_I(element) {
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

  public getVertices_H(element) {
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
      element["steel_w1"] = element["steel_h1"] / 2;
    }
    if (element["steel_w3"] === 0) {
      element["steel_w3"] = element["steel_h3"] / 2;
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
      element["steel_b1"],
      -element["steel_w1"] + element["steel_h2"] / 2,
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
      element["steel_b1"] + element["steel_b2"],
      element["steel_w3"] - element["steel_w1"],
      0
    );

    vertices.push(list); // 頂点情報を追加

    return vertices;
  }

  public getVertices_box(element) {
    const vertices = []; // returnする頂点情報

    if (element["steel_b3"] === 0) {
      element["steel_b3"] = element["steel_b2"];
    }
    if (element["steel_b2"] === 0) {
      element["steel_b2"] = element["steel_b3"];
    }
    if (element["steel_b1"] === 0) {
      element["steel_b1"] = element["steel_b4"];
    }
    if (element["steel_b4"] === 0) {
      element["steel_b4"] = element["steel_b1"];
    }
    if (element["steel_h3"] === 0) {
      element["steel_h3"] = element["steel_h2"];
    }
    if (element["steel_h2"] === 0) {
      element["steel_h2"] = element["steel_h3"];
    }
    if (element["steel_h1"] === 0) {
      element["steel_h1"] = element["steel_h4"];
    }
    if (element["steel_h4"] === 0) {
      element["steel_h4"] = element["steel_h1"];
    }
    if (element["steel_w3"] === 0) {
      element["steel_w3"] = element["steel_w2"];
    }
    if (element["steel_w2"] === 0) {
      element["steel_w2"] = element["steel_w3"];
    }
    if (element["steel_w1"] === 0) {
      element["steel_w1"] = (element["steel_b1"] - element["steel_w2"]) / 2;
    }

    if (element["lib_b1"] === 0) {
      element["lib_b1"] = element["lib_b4"];
    }
    if (element["lib_b4"] === 0) {
      element["lib_b4"] = element["lib_b1"];
    }
    if (element["lib_b2"] === 0) {
      element["lib_b2"] = element["lib_b3"];
    }
    if (element["lib_b3"] === 0) {
      element["lib_b3"] = element["lib_b2"];
    }

    if (element["lib_h1"] === 0) {
      element["lib_h1"] = element["lib_h4"];
    }
    if (element["lib_h4"] === 0) {
      element["lib_h4"] = element["lib_h1"];
    }
    if (element["lib_h2"] === 0) {
      element["lib_h2"] = element["lib_h3"];
    }
    if (element["lib_h3"] === 0) {
      element["lib_h3"] = element["lib_h2"];
    }

    if (element["lib_n1"] === 0) {
      element["lib_n1"] = element["lib_n4"];
      element["lib_w1"] = 0;
    }
    if (element["lib_n4"] === 0) {
      element["lib_n4"] = 0;
      element["lib_w4"] = 0;
    }
    if (element["lib_n2"] === 0) {
      element["lib_n2"] = element["lib_n3"];
      element["lib_w2"] = 0;
    }
    if (element["lib_n3"] === 0) {
      element["lib_n3"] = 0;
      element["lib_w3"] = 0;
    }

    // パターンごとに分岐
    const PIflag =
      element["steel_w2"] > element["steel_b4"] ||
      element["steel_w3"] > element["steel_b4"];

    let theta =
      element["steel_w2"] == 0
        ? 0
        : Math.atan(
            (element["steel_h3"] - element["steel_h2"]) / element["steel_w2"]
          );

    let fai_1, fai_2;
    if (element["steel_w2"] - element["steel_w3"] == 0) {
      fai_1 = 0.5 * Math.PI;
      fai_2 = 0.5 * Math.PI;
    } else {
      fai_1 = Math.atan(
        element["steel_h2"] /
          (0.5 * (element["steel_w2"] - element["steel_w3"]))
      );
      fai_2 = Math.atan(
        element["steel_h3"] /
          (0.5 * (element["steel_w2"] - element["steel_w3"]))
      );
      if (fai_1 < 0) {
        fai_1 = Math.PI + fai_1;
      }
      if (fai_2 < 0) {
        fai_2 = Math.PI + fai_2;
      }
      fai_2 = Math.PI - fai_2;
    }

    // 空白セルがあったときの処理
    if (PIflag) {
      if (element["steel_b5"] === 0) {
        element["steel_b5"] = element["steel_b4"];
      }
      if (element["steel_h5"] === 0) {
        element["steel_h5"] = element["steel_h4"];
      }
      if (element["steel_w4"] === 0) {
        element["steel_w4"] = element["steel_b4"] / 2;
      }
      if (element["steel_w5"] === 0) {
        element["steel_w5"] = element["steel_b5"] / 2;
      }
      theta = 0;
    } else {
      if (element["steel_w4"] === 0) {
        element["steel_w4"] = (element["steel_b4"] - element["steel_w3"]) / 2;
      }
    }

    let st_shape = this.steelVertical_Shape(element, theta, fai_1, fai_2);

    if (element["lib_w1"] === 0) {
      if (element["lib_n1"] === 1) {
        element["lib_w1"] = 0;
      } else {
        element["lib_w1"] =
          (element["steel_w2"] -
            0.5 * st_shape.st2_btLen -
            0.5 * st_shape.st3_btLen) /
          (element["lib_n1"] + 1);
      }
    }
    if (element["lib_w4"] === 0) {
      if (PIflag) {
        element["lib_w4"] =
          (element["steel_b4"] -
            element["steel_w4"] -
            0.5 * st_shape.st2_btLen) /
          (element["lib_n4"] + 1);
      } else {
        element["lib_w4"] =
          (element["steel_w3"] -
            0.5 * st_shape.st2_btLen -
            0.5 * st_shape.st3_btLen) /
          (element["lib_n4"] + 1);
      }
    }

    if (element["lib_w5"] === 0) {
      if (PIflag) {
        element["lib_w5"] =
          (element["steel_w5"] - 0.5 * st_shape.st3_btLen) /
          (element["lib_n5"] + 1);
      }
    }

    if (element["lib_w2"] === 0) {
      if (element["lib_n2"] === 1) {
        element["lib_w2"] = 0;
      } else {
        element["lib_w2"] = element["steel_h2"] / (element["lib_n2"] + 1);
      }
    }
    if (element["lib_w3"] === 0) {
      if (element["lib_n3"] === 1) {
        element["lib_w3"] = 0;
      } else {
        element["lib_w3"] = element["steel_h3"] / (element["lib_n3"] + 1);
      }
    }

    // 図形を描く
    if (PIflag) {
      for (let i = 1; i <= 5; i++) {
        vertices.push(this.box_vertice(element, i, theta, st_shape));
      }
      for (let i = 1; i <= 5; i++) {
        for (let j = 0; j < element["lib_n" + String(i)]; j++) {
          if (element["lib_n" + String(i)] !== 0) {
            vertices.push(
              this.box_lib_vertice(
                element,
                i,
                j,
                theta,
                fai_1,
                fai_2,
                st_shape,
                PIflag
              )
            );
          }
        }
      }
    } else {
      // フランジ・ウェブを描く
      for (let i = 1; i <= 4; i++) {
        vertices.push(this.box_vertice(element, i, theta, st_shape));
      }

      // リブを描く
      for (let i = 1; i <= 4; i++) {
        for (let j = 0; j < element["lib_n" + String(i)]; j++) {
          if (element["lib_n" + String(i)] !== 0) {
            vertices.push(
              this.box_lib_vertice(
                element,
                i,
                j,
                theta,
                fai_1,
                fai_2,
                st_shape,
                PIflag
              )
            );
          }
        }
      }
    }

    return vertices;
  }

  public steelVertical_Shape(element, theta, fai_1, fai_2) {
    let st_shape = {
      st2_btLen: 0,
      st2_upLen: 0,
      st2_sideLen: 0,
      st3_btLen: 0,
      st3_upLen: 0,
      st3_sideLen: 0,
    };

    let a1 = Math.PI - theta - fai_1;
    st_shape.st2_btLen = element["steel_b2"] / Math.cos(-0.5 * Math.PI + fai_1);
    st_shape.st2_upLen = (st_shape.st2_btLen / Math.sin(a1)) * Math.sin(fai_1);

    let a2 = Math.PI - theta - fai_2;
    st_shape.st3_btLen = element["steel_b3"] / Math.cos(-0.5 * Math.PI + fai_2);
    st_shape.st3_upLen = (st_shape.st3_btLen / Math.sin(a2)) * Math.sin(fai_2);

    st_shape.st2_sideLen =
      fai_1 == 0.5 * Math.PI
        ? 0
        : (element["steel_h2"] - 0.5 * st_shape.st2_upLen * Math.sin(theta)) /
          Math.tan(fai_1);

    st_shape.st3_sideLen =
      fai_2 == 0.5 * Math.PI
        ? 0
        : (element["steel_h3"] - 0.5 * st_shape.st3_upLen * Math.sin(theta)) /
          Math.tan(fai_2);
    return st_shape;
  }

  public getCentroid_box(vertices): THREE.Vector3 {
    let Ax: number = 0;
    let Ay: number = 0;
    let Az: number = 0;
    let A: number = 0;
    for (const num of Object.keys(vertices)) {
      const vertice = vertices[num].vertice;
      const position = vertices[num].position;
      // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
      const abacad = this.param.getAbAcAd(vertice);
      const ab = abacad.ab;
      const ac = abacad.ac;
      const ad = abacad.ad;
      // 面積が0になるのでreturn
      if (
        ab.x === 0 &&
        ab.y === 0 &&
        ab.z === 0 &&
        ac.x === 0 &&
        ac.y === 0 &&
        ac.z === 0 &&
        ad.x === 0 &&
        ad.y === 0 &&
        ad.z === 0
      ) {
        return new THREE.Vector3(0, 0, 0);
      }
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

  private box_vertice(
    element: number,
    no: number,
    theta: number = 0,
    st_shape
  ) {
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    let x, y, z;
    let st2_btLen = st_shape.st2_btLen;
    let st2_upLen = st_shape.st2_upLen;
    let st2_sideLen = st_shape.st2_sideLen;
    let st3_btLen = st_shape.st3_btLen;
    let st3_upLen = st_shape.st3_upLen;
    let st3_sideLen = st_shape.st3_sideLen;

    let LibFlg = false;

    switch (no) {
      case 1:
        x = 0;
        y = 0;
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b1"],
            element["steel_b1"] * Math.tan(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b1"] + element["steel_h1"] * Math.sin(theta),
            element["steel_b1"] * Math.tan(theta) -
              element["steel_h1"] * Math.cos(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_h1"] * Math.sin(theta),
            -element["steel_h1"] * Math.cos(theta),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;
      case 2:
        x = this.drawPosition(element, st_shape, theta, 0, 1, 2, LibFlg);
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          0,
          Math.tan(theta),
          2,
          LibFlg
        );
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            st2_upLen * Math.cos(theta),
            st2_upLen * Math.sin(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            st2_btLen + st2_sideLen,
            -element["steel_h2"] + 0.5 * st2_upLen * Math.sin(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            st2_sideLen,
            -element["steel_h2"] + 0.5 * st2_upLen * Math.sin(theta),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;
      case 3:
        x = this.drawPosition(
          element,
          st_shape,
          theta,
          element["steel_w2"],
          1,
          3,
          LibFlg
        );
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          Math.tan(theta) * element["steel_w2"],
          Math.tan(theta),
          3,
          LibFlg
        );
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            st3_upLen * Math.cos(theta),
            st3_upLen * Math.sin(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            st3_btLen + st3_sideLen,
            -element["steel_h3"] + 0.5 * st3_upLen * Math.sin(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            st3_sideLen,
            -element["steel_h3"] + 0.5 * st3_upLen * Math.sin(theta),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);

        break;
      case 4:
        let option_X = st2_sideLen + 0.5 * st2_btLen - element["steel_w4"];
        let option_Y = -element["steel_h2"] + 0.5 * st2_upLen * Math.sin(theta);

        x = this.drawPosition(element, st_shape, theta, option_X, 1, 2, LibFlg);
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          option_Y,
          Math.tan(theta),
          2,
          LibFlg
        );
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(element["steel_b4"], 0, 0));
        list.vertice.push(
          new THREE.Vector3(element["steel_b4"], -element["steel_h4"], 0)
        );
        list.vertice.push(new THREE.Vector3(0, -element["steel_h4"], 0));
        list.position = new THREE.Vector3(x, y, z);

        break;
      case 5:
        let option_X1 =
          element["steel_w2"] +
          st3_sideLen +
          0.5 * st3_btLen -
          element["steel_w5"];
        let option_Y1 =
          Math.tan(theta) * element["steel_w2"] -
          element["steel_h3"] +
          0.5 * st3_upLen * Math.sin(theta);

        x = this.drawPosition(
          element,
          st_shape,
          theta,
          option_X1,
          1,
          3,
          LibFlg
        );
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          option_Y1,
          Math.tan(theta),
          3,
          LibFlg
        );
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(element["steel_b5"], 0, 0));
        list.vertice.push(
          new THREE.Vector3(element["steel_b5"], -element["steel_h5"], 0)
        );
        list.vertice.push(new THREE.Vector3(0, -element["steel_h5"], 0));
        list.position = new THREE.Vector3(x, y, z);

        break;
    }
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    return list;
  }

  private box_lib_vertice(
    element: number,
    no: number,
    co: number,
    theta: number = 0,
    fai_1: number = 0,
    fai_2: number = 0,
    st_shape,
    PIflag
  ) {
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    let x = 0,
      y = 0,
      z = 0;
    let x_remain, y_remain;
    let st2_btLen = st_shape.st2_btLen;
    let st2_upLen = st_shape.st2_upLen;
    let st2_sideLen = st_shape.st2_sideLen;
    let st3_btLen = st_shape.st3_btLen;
    let st3_upLen = st_shape.st3_upLen;
    let st3_sideLen = st_shape.st3_sideLen;

    let LibFlg = true;

    let lib1_width =
      0.5 *
        (element["steel_w2"] -
          0.5 * st2_btLen -
          0.5 * st3_btLen -
          element["lib_w1"] * (element["lib_n1"] - 1)) +
      element["lib_w1"] * co -
      0.5 * element["lib_b1"] * Math.cos(theta);

    let lib4_width =
      0.5 *
        (element["steel_w3"] -
          0.5 * st2_btLen -
          0.5 * st3_btLen -
          element["lib_w4"] * (element["lib_n4"] - 1)) +
      element["lib_w4"] * co -
      0.5 * element["lib_b4"];
    if (PIflag) {
      if (element["lib_n4"] == 1) {
        lib4_width =
          element["steel_b4"] -
          element["steel_w4"] -
          0.5 * st2_btLen -
          element["lib_w4"] * element["lib_n4"] -
          0.5 * element["lib_b4"];
      } else {
        lib4_width =
          0.5 *
            (element["steel_b4"] -
              element["steel_w4"] -
              0.5 * st2_btLen -
              element["lib_w4"] * (element["lib_n4"] - 1)) +
          element["lib_w4"] * co -
          0.5 * element["lib_b4"];
      }
    }
    let lib5_width =
      0.5 *
        (element["steel_w5"] -
          0.5 * element["steel_b3"] -
          element["lib_w5"] * (element["lib_n5"] - 1)) +
      element["lib_w5"] * co +
      0.5 * element["lib_b5"];

    if (element["lib_n5"] == 1) {
      lib5_width =
        element["steel_w5"] -
        0.5 * st3_btLen -
        element["lib_w5"] * element["lib_n5"] +
        0.5 * element["lib_b5"];
    }

    let lib2_height =
      0.5 *
        (element["steel_h2"] - element["lib_w2"] * (element["lib_n2"] - 1)) +
      element["lib_w2"] * co;
    let lib3_height =
      0.5 *
        (element["steel_h3"] - element["lib_w3"] * (element["lib_n3"] - 1)) +
      element["lib_w3"] * co;

    let lib2_side = fai_1 == 0.5 * Math.PI ? 0 : lib2_height / Math.tan(fai_1);
    let lib3_side = fai_2 == 0.5 * Math.PI ? 0 : lib3_height / Math.tan(fai_2);

    switch (no) {
      case 1:
        x = this.drawPosition(
          element,
          st_shape,
          theta,
          lib1_width,
          1,
          2,
          LibFlg
        );
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          Math.tan(theta) * lib1_width,
          Math.tan(theta),
          2,
          LibFlg
        );

        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["lib_b1"] * Math.cos(theta),
            element["lib_b1"] * Math.sin(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_b1"] * Math.cos(theta) +
              element["lib_h1"] * Math.sin(theta),
            element["lib_b1"] * Math.sin(theta) -
              element["lib_h1"] * Math.cos(theta),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_h1"] * Math.sin(theta),
            -element["lib_h1"] * Math.cos(theta),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);

        break;

      case 2:
        let lib_deg = 0.5 * Math.PI - fai_1;
        x_remain = -0.5 * element["lib_b2"] * Math.sin(lib_deg);
        y_remain = 0.5 * element["lib_b2"] * Math.cos(lib_deg);

        x = this.drawPosition(
          element,
          st_shape,
          theta,
          lib2_side + x_remain,
          1,
          2,
          LibFlg
        );
        y = this.drawPosition(
          element,
          st_shape,
          theta,
          -lib2_height + y_remain,
          Math.tan(theta),
          2,
          LibFlg
        );

        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["lib_h2"] * Math.cos(lib_deg),
            element["lib_h2"] * Math.sin(lib_deg),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_h2"] * Math.cos(lib_deg) +
              element["lib_b2"] * Math.sin(lib_deg),
            element["lib_h2"] * Math.sin(lib_deg) -
              element["lib_b2"] * Math.cos(lib_deg),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_b2"] * Math.sin(lib_deg),
            -element["lib_b2"] * Math.cos(lib_deg),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;

      case 3:
        let lib_deg2 = 0.5 * Math.PI - fai_2;
        x_remain =
          -0.5 * element["lib_b3"] * Math.sin(lib_deg2) -
          element["lib_h3"] * Math.cos(lib_deg2);
        y_remain =
          0.5 * element["lib_b3"] * Math.cos(lib_deg2) -
          element["lib_h3"] * Math.sin(lib_deg2);

        // x = this.drawPosition(
        //   element,
        //   st_shape,
        //   theta,
        //   element["steel_w2"] + lib3_side + x_remain,
        //   1,
        //   3,
        //   LibFlg
        // );
        // y = this.drawPosition(
        //   element,
        //   st_shape,
        //   theta,
        //   Math.tan(theta) * element["steel_w2"] - lib3_height + y_remain,
        //   Math.tan(theta),
        //   3,
        //   LibFlg
        // );

        x =
          element["steel_w1"] +
          element["steel_w2"] +
          0.5 * element["steel_h1"] * Math.sin(theta) -
          0.5 * st3_upLen * Math.cos(theta) +
          lib3_side +
          x_remain;

        y =
          Math.tan(theta) *
            (element["steel_w1"] +
              element["steel_w2"] -
              0.5 * element["steel_h1"] * Math.sin(theta) -
              0.5 * st3_upLen * Math.cos(theta)) -
          element["steel_h1"] * Math.cos(theta) -
          lib3_height +
          y_remain;

        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["lib_h3"] * Math.cos(lib_deg2),
            element["lib_h3"] * Math.sin(lib_deg2),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_h3"] * Math.cos(lib_deg2) +
              element["lib_b3"] * Math.sin(lib_deg2),
            element["lib_h3"] * Math.sin(lib_deg2) -
              element["lib_b3"] * Math.cos(lib_deg2),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["lib_b3"] * Math.sin(lib_deg2),
            -element["lib_b3"] * Math.cos(lib_deg2),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;

      case 4:
        x_remain = st2_sideLen;
        y_remain =
          -element["steel_h2"] +
          0.5 * st2_upLen * Math.sin(theta) +
          element["lib_h4"];

        x =
          element["steel_w1"] +
          0.5 * element["steel_h1"] * Math.sin(theta) +
          0.5 * st2_upLen * Math.cos(theta) +
          x_remain +
          lib4_width;
        y =
          Math.tan(theta) *
            (element["steel_w1"] -
              0.5 * element["steel_h1"] * Math.sin(theta) -
              0.5 * st2_upLen * Math.cos(theta)) -
          element["steel_h1"] * Math.cos(theta) +
          y_remain;
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(element["lib_b4"], 0, 0));
        list.vertice.push(
          new THREE.Vector3(element["lib_b4"], -element["lib_h4"], 0)
        );
        list.vertice.push(new THREE.Vector3(0, -element["lib_h4"], 0));
        list.position = new THREE.Vector3(x, y, z);

        break;

      case 5:
        if (PIflag) {
          x_remain = st3_sideLen;
          y_remain =
            -element["steel_h3"] +
            0.5 * st3_upLen * Math.sin(theta) +
            element["lib_h5"];

          x =
            element["steel_w1"] +
            element["steel_w2"] -
            0.5 * element["steel_h1"] * Math.sin(theta) -
            0.5 * st3_upLen * Math.cos(theta) +
            x_remain -
            lib5_width;
          y =
            Math.tan(theta) *
              (element["steel_w1"] +
                element["steel_w2"] -
                0.5 * element["steel_h1"] * Math.sin(theta) -
                0.5 * st3_upLen * Math.cos(theta)) -
            element["steel_h1"] * Math.cos(theta) +
            y_remain;
          z = 0;

          list.vertice.push(new THREE.Vector3(0, 0, 0));
          list.vertice.push(new THREE.Vector3(element["lib_b5"], 0, 0));
          list.vertice.push(
            new THREE.Vector3(element["lib_b5"], -element["lib_h5"], 0)
          );
          list.vertice.push(new THREE.Vector3(0, -element["lib_h5"], 0));
          list.position = new THREE.Vector3(x, y, z);
        }
        break;
    }
    return list;
  }

  private drawPosition(element, st_shape, theta, option, Mt, Vt, Lib): number {
    // x座標かy座標かの判定
    let flg = Mt === 1 ? 1 : -1;

    // st2,st3のどちらの値を使うか
    let VtFlg = Vt === 2 ? st_shape.st2_upLen : st_shape.st3_upLen;

    // フランジ・ウェブ/リブのどちらか
    let LibFlg = Lib ? 1 : -1;

    let result =
      Mt *
        (element["steel_w1"] +
          flg * (0.5 * element["steel_h1"] * Math.sin(theta)) +
          LibFlg * 0.5 * VtFlg * Math.cos(theta)) +
      option;

    if (flg === -1) {
      result -= element["steel_h1"] * Math.cos(theta);
    }
    return result;
  }

  private positionY(Mt, w1, w2, w3, h, b, theta, fai_1, fai_2, co = 0): number {
    const result =
      Mt *
        (w1 +
          w2 +
          w3 * co -
          0.5 * h * Math.sin(theta) -
          0.5 * b * Math.cos(theta)) -
      h * Math.cos(theta);
    return result;
  }

  private lib_position(steel_w: number, lib_w: number, lib_n: number): number {
    steel_w = steel_w / 2;
    lib_n -= 1;
    const lib_width = (lib_w * lib_n) / 2;
    const lib_start = steel_w - lib_width;
    return lib_start;
  }

  private lib_write(element) {}
}
