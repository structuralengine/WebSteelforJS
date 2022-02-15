import { Injectable } from "@angular/core";
import { InputBarsService } from "src/app/components/bars/bars.service";
import { InputSteelsService } from "src/app/components/steels/steels.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import * as THREE from "three";
import { environment } from "src/environments/environment";
import { ResultDataService } from "../result-data.service";

@Injectable({
  providedIn: "root",
})
export class SetBoxService {
  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
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
    const h: number = shape.H;
    const b: number = shape.B;

    const section = {
      Height: h, // 断面高さ
      WTop: b, // 断面幅（上辺）
      WBottom: b, // 断面幅（底辺）
      ElasticID: "c", // 材料番号
    };
    result.Concretes.push(section);
    result["member"] = shape;

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

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

    const stl: any = this.steel.getCalcData(index); // 鉄骨

    // steel
    const steel = {
      A: null,
      Ix: null, 
      Iy: null,
      rs: null,
    };
    const element = {};
    for (const num of Object.keys(stl)) {
      const n = this.helper.toNumber(num);
      if (n !== null) {
        steel[n] = {
          title: stl[num].title,
          steel_b: null,
          steel_h: null,
          steel_w: null,
          lib_b: null,
          lib_h: null,
          lib_w: null,
          lib_n: null,
          fsy: null,
        };
      }
    }

    if (stl !== null) {
      steel.rs = safety.safety_factor.S_rs;

      let A: number = 0;
      // 1~5を入手
      for (const num of Object.keys(steel)) {
        if (num === "rs" || num === "A" || num === "Ix" || num === "Iy" ) continue;
        const steel0 = steel[num];
        for (const key of ["steel_b", "steel_h", "steel_w"]) {
          steel0[key] = stl[num][key];
        }
        // 断面積を算出し, 加算する
        if (steel0["steel_b"] === 0 || steel0["steel_h"] === 0 || steel0["steel_b"] == null || steel0["steel_h"] == null) {
          A += 0
        } else {
          A += steel0["steel_b"] * steel0["steel_h"];
        }
        // 鉄骨強度を入手し, fsyに入れる
        // steel0['fsy'] = this.helper.getFsyk2(stl[num]upper_thickness, safety.material_steel);
        steel0["fsy"] = 235; // 鉄骨幅は部材ナンバーごとに異なるため、一旦保留
      }
      
      // 断面積を関数によって算出し, 代入する
      // A = this.getArea_box(element);
      steel.A = A;
    }

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

    if (element["lib_w1"] === 0) {
      element["lib_w1"] = element["lib_w4"];
    }
    if (element["lib_w4"] === 0) {
      element["lib_w4"] = element["lib_w1"];
    }
    if (element["lib_w2"] === 0) {
      element["lib_w2"] = element["lib_w3"];
    }
    if (element["lib_w3"] === 0) {
      element["lib_w3"] = element["lib_w2"];
    }

    if (element["lib_n1"] === 0) {
      element["lib_n1"] = element["lib_n4"];
    }
    if (element["lib_n4"] === 0) {
      element["lib_n4"] = element["lib_n1"];
    }
    if (element["lib_n2"] === 0) {
      element["lib_n2"] = element["lib_n3"];
    }
    if (element["lib_n3"] === 0) {
      element["lib_n3"] = element["lib_n2"];
    }

    // パターンごとに分岐
    const PIflag =
      element["steel_w2"] > element["steel_b4"] ||
      element["steel_w3"] > element["steel_b4"];

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
    } else {
      if (element["steel_w4"] === 0) {
        element["steel_w4"] = (element["steel_b4"] - element["steel_w3"]) / 2;
      }
    }

    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    const liner =
      (element["steel_h3"] - element["steel_h2"]) / element["steel_w2"];

    const lib1_posi = this.lib_position(
      element["steel_w2"],
      element["lib_w1"],
      element["lib_n1"]
    );

    const lib2_posi = this.lib_position(
      element["steel_h2"],
      element["lib_w2"],
      element["lib_n2"]
    );

    const lib3_posi = this.lib_position(
      element["steel_h3"],
      element["lib_w3"],
      element["lib_n3"]
    );

    if (!PIflag) {
      const lib4_posi = this.lib_position(
        element["steel_w3"],
        element["lib_w4"],
        element["lib_n4"]
      );
    }

    // if (PIflag) {
    // } else {
    let θ =
      element["steel_w2"] == 0
        ? 0
        : Math.atan(
            (element["steel_h3"] - element["steel_h2"]) / element["steel_w2"]
          );
    let φ1 =
      element["steel_w2"] - element["steel_w3"] == 0
        ? 0
        : Math.atan(
            element["steel_h2"] /
              0.5 /
              (element["steel_w2"] - element["steel_w3"])
          );
    let φ2 =
      element["steel_w2"] - element["steel_w3"] == 0
        ? 0
        : Math.atan(
            element["steel_h3"] /
              0.5 /
              (element["steel_w2"] - element["steel_w3"])
          );
    // }

    vertices.push(this.steel_vertice(element, 1, θ, φ1, φ2));
    vertices.push(this.steel_vertice(element, 4, θ, φ1, φ2));
    vertices.push(this.steel_vertice(element, 2, θ, φ1, φ2));
    vertices.push(this.steel_vertice(element, 3, θ, φ1, φ2));

    return vertices;

    // ////////// 1部材について //////////
    // // h2 !== h3 && PIflag === falseの時、右肩上がり(下がり)になる
    // // if (h2 === h3 || PIflag === true) {
    // if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //   list.vertice.push(new THREE.Vector3(0, 0, 0));
    //   list.vertice.push(new THREE.Vector3(element["steel_b1"], 0, 0));
    //   list.vertice.push(
    //     new THREE.Vector3(element["steel_b1"], -element["steel_h1"], 0)
    //   );
    //   list.vertice.push(new THREE.Vector3(0, -element["steel_h1"], 0));
    //   list.position = new THREE.Vector3(0, 0, 0);
    //   vertices.push(list); // 頂点情報を追加

    //   // リブ
    //   for (let i = 0; i < element["lib_n1"]; i++) {
    //     let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["lib_b1"], 0, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(element["lib_b1"], -element["lib_h1"], 0)
    //     );
    //     list.vertice.push(new THREE.Vector3(0, -element["lib_h1"], 0));
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] +
    //         lib1_posi -
    //         element["lib_b1"] / 2 +
    //         element["lib_w1"] * i,
    //       -element["steel_h1"],
    //       0
    //     );
    //     vertices.push(list); // 頂点情報を追加
    //   }
    // } else if (!PIflag) {
    //   // ななめ
    //   let y = liner * element["steel_b1"];
    //   list.vertice.push(new THREE.Vector3(0, 0, 0));
    //   list.vertice.push(new THREE.Vector3(element["steel_b1"], y, 0));
    //   list.vertice.push(
    //     new THREE.Vector3(element["steel_b1"], y - element["steel_h1"], 0)
    //   );
    //   list.vertice.push(new THREE.Vector3(0, -element["steel_h1"], 0));

    //   list.position = new THREE.Vector3(0, 0, 0);
    //   vertices.push(list); // 頂点情報を追加

    //   // リブ未設定
    // }

    // ////////// 2部材について //////////
    // list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    // if (element["steel_w2"] === element["steel_w3"]) {
    //   if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b2"], 0, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(element["steel_b2"], -element["steel_h2"], 0)
    //     );
    //     list.vertice.push(new THREE.Vector3(0, -element["steel_h2"], 0));
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] - element["steel_b2"] / 2,
    //       -element["steel_h1"],
    //       0
    //     );
    //     // リブ
    //     for (let i = 0; i < element["lib_n2"]; i++) {
    //       let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
    //       list.vertice.push(new THREE.Vector3(0, 0, 0));
    //       list.vertice.push(new THREE.Vector3(element["lib_b2"], 0, 0));
    //       list.vertice.push(
    //         new THREE.Vector3(element["lib_b2"], -element["lib_h2"], 0)
    //       );
    //       list.vertice.push(new THREE.Vector3(0, -element["lib_h2"], 0));
    //       list.position = new THREE.Vector3(
    //         element["steel_w1"] +
    //           element["lib_b2"] / 2 -
    //           element["steel_b1"] -
    //           lib2_posi +
    //           element["steel_h2"] -
    //           element["lib_w2"] * i,
    //         0
    //       );
    //       vertices.push(list); // 頂点情報を追加
    //     }
    //   } else if (!PIflag) {
    //     let y = liner * element["steel_b2"];
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b2"], y, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b2"],
    //         -element["steel_h2"] + y / 2,
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(0, -element["steel_h2"] + y / 2, 0)
    //     );
    //     y = liner * (element["steel_w1"] - element["steel_b2"] / 2);
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] - element["steel_b2"] / 2,
    //       y - element["steel_h1"],
    //       0
    //     );
    //   }

    //   // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
    //   // 分岐を追加したら、コメントを削除
    //   // if (h2 === h3) {
    //   // } else {
    //   // }
    // } else {
    //   // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
    //   // 分岐を追加したら、コメントを削除
    //   if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b2"], 0, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b2"] +
    //           (element["steel_w2"] - element["steel_w3"]) / 2,
    //         -element["steel_h2"],
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         (element["steel_w2"] - element["steel_w3"]) / 2,
    //         -element["steel_h2"],
    //         0
    //       )
    //     );
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] - element["steel_b2"] / 2,
    //       -element["steel_h1"],
    //       0
    //     );
    //   } else if (!PIflag) {
    //     let y = liner * element["steel_b2"];
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b2"], y, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b2"] +
    //           (element["steel_w2"] - element["steel_w3"]) / 2,
    //         -element["steel_h2"] + y / 2,
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         (element["steel_w2"] - element["steel_w3"]) / 2,
    //         -element["steel_h2"] + y / 2,
    //         0
    //       )
    //     );
    //     y = liner * (element["steel_w1"] - element["steel_b2"] / 2);
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] - element["steel_b2"] / 2,
    //       y - element["steel_h1"],
    //       0
    //     );
    //   }
    // }
    // // } else {
    // //   // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
    // //   // 分岐を追加したら、コメントを削除
    // //   if (h2 === h3) {
    // //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b2, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b2 + (w2 - w3) / 2, -h2, 0));
    // //     list.vertice.push(new THREE.Vector3((w2 - w3) / 2, -h2, 0));
    // //     list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
    // //   } else {
    // //     let y = ((h3 - h2) / w2) * b2;
    // //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b2, y, 0));
    // //     list.vertice.push(
    // //       new THREE.Vector3(b2 + (w2 - w3) / 2, -h2 + y / 2, 0)
    // //     );
    // //     list.vertice.push(new THREE.Vector3((w2 - w3) / 2, -h2 + y / 2, 0));
    // //     y = ((h3 - h2) / w2) * (w1 - b2 / 2) - h1;
    // //     list.position = new THREE.Vector3(w1 - b2 / 2, y, 0);
    // //   }
    // // }
    // vertices.push(list); // 頂点情報を追加

    // ////////// 3部材について //////////
    // list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    // if (element["steel_w2"] === element["steel_w3"]) {
    //   if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b3"], 0, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(element["steel_b3"], -element["steel_h3"], 0)
    //     );
    //     list.vertice.push(new THREE.Vector3(0, -element["steel_h3"], 0));
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2,
    //       -element["steel_h1"],
    //       0
    //     );
    //   } else if (!PIflag) {
    //     let y = liner * element["steel_b3"];
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b2"], y, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b2"],
    //         -element["steel_h3"] + y / 2,
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(0, -element["steel_h3"] + y / 2, 0)
    //     );
    //     y =
    //       liner *
    //       (element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2);
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2,
    //       y - element["steel_h1"],
    //       0
    //     );
    //   }
    // } else {
    //   // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
    //   // 分岐を追加したら、コメントを削除
    //   if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b3"], 0, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b3"] +
    //           (element["steel_w3"] - element["steel_w2"]) / 2,
    //         -element["steel_h3"],
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         (element["steel_w3"] - element["steel_w2"]) / 2,
    //         -element["steel_h3"],
    //         0
    //       )
    //     );
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2,
    //       -element["steel_h1"],
    //       0
    //     );
    //   } else if (!PIflag) {
    //     let y = liner * element["steel_b3"];
    //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    //     list.vertice.push(new THREE.Vector3(element["steel_b3"], y, 0));
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         element["steel_b3"] +
    //           (element["steel_w3"] - element["steel_w2"]) / 2,
    //         -element["steel_h3"] + y / 2,
    //         0
    //       )
    //     );
    //     list.vertice.push(
    //       new THREE.Vector3(
    //         (element["steel_w3"] - element["steel_w2"]) / 2,
    //         -element["steel_h3"] + y / 2,
    //         0
    //       )
    //     );
    //     y =
    //       liner *
    //       (element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2);
    //     list.position = new THREE.Vector3(
    //       element["steel_w1"] + element["steel_w2"] - element["steel_b3"] / 2,
    //       y - element["steel_h1"],
    //       0
    //     );
    //   }
    // }
    // //  else {
    // //   // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
    // //   // 分岐を追加したら、コメントを削除
    // //   if (h2 === h3) {
    // //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b3, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b3 - (w2 - w3) / 2, -h3, 0));
    // //     list.vertice.push(new THREE.Vector3(-(w2 - w3) / 2, -h3, 0));
    // //     list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
    // //   } else {
    // //     let y = ((h3 - h2) / w2) * b3;
    // //     list.vertice.push(new THREE.Vector3(0, 0, 0));
    // //     list.vertice.push(new THREE.Vector3(b3, y, 0));
    // //     list.vertice.push(
    // //       new THREE.Vector3(b3 - (w2 - w3) / 2, -h3 + y / 2, 0)
    // //     );
    // //     list.vertice.push(new THREE.Vector3(-(w2 - w3) / 2, -h3 + y / 2, 0));
    // //     y = ((h3 - h2) / w2) * (w1 + w2 - b3 / 2) - h1;
    // //     list.position = new THREE.Vector3(w1 + w2 - b3 / 2, y, 0);
    // //   }
    // // }
    // vertices.push(list); // 頂点情報を追加

    // ////////// 4部材について //////////
    // list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    // // positionのみ分岐. 1, 2, 3部材の位置によって分岐する
    // list.vertice.push(new THREE.Vector3(0, 0, 0));
    // list.vertice.push(new THREE.Vector3(element["steel_b4"], 0, 0));
    // list.vertice.push(
    //   new THREE.Vector3(element["steel_b4"], -element["steel_h4"], 0)
    // );
    // list.vertice.push(new THREE.Vector3(0, -element["steel_h4"], 0));
    // // box型であれば
    // if (element["steel_h2"] === element["steel_h3"] || PIflag) {
    //   list.position = new THREE.Vector3(
    //     element["steel_w1"] +
    //       (element["steel_w2"] - element["steel_w3"]) / 2 -
    //       element["steel_w4"],
    //     -element["steel_h1"] - element["steel_h2"],
    //     0
    //   ); // パターンA
    // } else if (!PIflag) {
    //   // 未計算状態. 計算後にコメントを削除
    //   let y = liner * element["steel_w1"];
    //   list.position = new THREE.Vector3(
    //     element["steel_w1"] +
    //       (element["steel_w2"] - element["steel_w3"]) / 2 -
    //       element["steel_w4"],
    //     y - element["steel_h1"] - element["steel_h2"],
    //     0
    //   ); // パターンC
    // }
    // //  else {
    // //   // PI型であれば
    // //   list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, -h1 - h2, 0); // パターンA
    // // }
    // vertices.push(list); // 頂点情報を追加

    // if (PIflag) {
    //   // PI型であれは5部材を設定する
    //   ////////// 5部材について //////////
    //   list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    //   // w2 === w3の条件で形状が分岐する. 計算式が同じためpositionの分岐は無し.
    //   list.vertice.push(new THREE.Vector3(0, 0, 0));
    //   list.vertice.push(new THREE.Vector3(element["steel_b5"], 0, 0));
    //   list.vertice.push(
    //     new THREE.Vector3(element["steel_b5"], -element["steel_h5"], 0)
    //   );
    //   list.vertice.push(new THREE.Vector3(0, -element["steel_h5"], 0));
    //   list.position = new THREE.Vector3(
    //     element["steel_w1"] +
    //       (element["steel_w2"] + element["steel_w3"]) / 2 -
    //       element["steel_w5"],
    //     -(element["steel_h1"] + element["steel_h3"]),
    //     0
    //   );
    //   vertices.push(list); // 頂点情報を追加
    // }
    // return vertices;
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
      const abacad = this.getAbAcAd(vertice);
      const ab = abacad.ab;
      const ac = abacad.ac;
      const ad = abacad.ad;
      // 面積が0になるのでreturn
      if ((ab.x === 0 && ab.y === 0 && ab.z === 0) && 
          (ac.x === 0 && ac.y === 0 && ac.z === 0) && 
          (ad.x === 0 && ad.y === 0 && ad.z === 0)   ) {
        return new THREE.Vector3(0, 0, 0)
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

  // 断面情報の算出(A, Ix, Iy)
  public getSectionParam(vertices) {
    const centroid = this.getCentroid_box(vertices);
    let A: number = 0;
    let Ix: number = 0;
    let Iy: number = 0;
    for (const steel of vertices) {
      const vertice = steel.vertice;
      const position = steel.position;
      const abacad = this.getAbAcAd(vertice);
      const ab = abacad.ab;
      const ac = abacad.ac;
      const ad = abacad.ad;
      // 面積が0になるのでreturn
      if ((ab.x === 0 && ab.y === 0 && ab.z === 0) && 
          (ac.x === 0 && ac.y === 0 && ac.z === 0) && 
          (ad.x === 0 && ad.y === 0 && ad.z === 0)   ) {
        return new THREE.Vector3(A, Ix, Iy)
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
      const delta1Ix = this.getTriangleI(ab, ac, centroid1);
      const delta1Iy = 0;
      const InertiaX1: number = delta1Ix
                              + area1 * Math.abs(centroid.x - (position.x + centroid1.x)) ** 2;
      const InertiaY1: number = delta1Iy
                              + area1 * Math.abs(centroid.y - (position.y + centroid1.y)) ** 2;
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
      const InertiaX2: number = /*三角形の断面二次モーメント*/0
                              + area2 * Math.abs(centroid.x - (position.x + centroid2.x)) ** 2;
      const InertiaY2: number = /*三角形の断面二次モーメント*/0
                              + area2 * Math.abs(centroid.y - (position.y + centroid2.y)) ** 2;
      // 情報を加算する 
      A += ( area1 + area2 );
      Ix += ( InertiaX1 + InertiaX2 );
      Iy += ( InertiaY1 + InertiaY2 );
    }
    return {A, Ix, Iy}
  }

  // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
  private getAbAcAd (vertice) {
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
    return {ab, ac, ad}
  }

  // 三角形の断面二次モーメント
  private getTriangleI (OA, OB, centroid): number {
    let I = 0;

    // const J1 = [[OA.x*OA.x + OB.x*OB.x, OA.x*OA.y + OB.x*OB.y, OA.x*OA.z + OB.x*OB.z],
    //             [OA.y*OA.x + OB.y*OB.x, OA.y*OA.y + OB.y*OB.y, OA.y*OA.z + OB.y*OB.z],
    //             [OA.z*OA.x + OB.z*OB.x, OA.z*OA.y + OB.z*OB.y, OA.z*OA.z + OB.z*OB.z]]
    // const J2 = [[centroid.x*centroid.x, centroid.x*centroid.y, centroid.x*centroid.z],
    //             [centroid.y*centroid.x, centroid.y*centroid.y, centroid.y*centroid.z],
    //             [centroid.z*centroid.x, centroid.z*centroid.y, centroid.z*centroid.z]]


    return I
  }

  private steel_vertice(
    element: number,
    no: number,
    θ: number = 0,
    φ1: number = 0,
    φ2: number = 0
  ) {
    let list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
    let x, y, z;
    let tan1 =
      φ1 == 0
        ? 0
        : (element["steel_h2"] - 0.5 * element["steel_b2"] * Math.sin(θ)) /
          Math.tan(φ1);
    let tan2 =
      φ2 == 0
        ? 0
        : -(element["steel_h3"] - 0.5 * element["steel_b3"] * Math.sin(θ)) /
          Math.tan(φ2);

    switch (no) {
      case 1:
        x = 0;
        y = 0;
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b1"],
            element["steel_b1"] * Math.tan(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b1"] + element["steel_h1"] * Math.sin(θ),
            element["steel_b1"] * Math.tan(θ) -
              element["steel_h1"] * Math.cos(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_h1"] * Math.sin(θ),
            -element["steel_h1"] * Math.cos(θ),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;
      case 2:
        x =
          element["steel_w1"] +
          0.5 * element["steel_h1"] * Math.sin(θ) -
          0.5 * element["steel_b2"] * Math.cos(θ);
        y =
          Math.tan(θ) *
            (element["steel_w1"] -
              0.5 * element["steel_h1"] * Math.sin(θ) -
              0.5 * element["steel_b2"] * Math.cos(θ)) -
          element["steel_h1"] * Math.cos(θ);
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b2"] * Math.cos(θ),
            element["steel_b2"] * Math.sin(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b2"] + tan1,
            -element["steel_h2"] + 0.5 * element["steel_b2"] * Math.sin(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            tan1,
            -element["steel_h2"] + 0.5 * element["steel_b2"] * Math.sin(θ),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);
        break;
      case 3:
        x =
          element["steel_w1"] +
          element["steel_w2"] +
          0.5 * element["steel_h1"] * Math.sin(θ) -
          0.5 * element["steel_b3"] * Math.cos(θ);
        y =
          Math.tan(θ) *
            (element["steel_w1"] +
              element["steel_w2"] -
              0.5 * element["steel_h1"] * Math.sin(θ) -
              0.5 * element["steel_b3"] * Math.cos(θ)) -
          element["steel_h1"] * Math.cos(θ);
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b3"] * Math.cos(θ),
            element["steel_b3"] * Math.sin(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            element["steel_b3"] + tan2,
            -element["steel_h3"] + 0.5 * element["steel_b3"] * Math.sin(θ),
            0
          )
        );
        list.vertice.push(
          new THREE.Vector3(
            tan2,
            -element["steel_h3"] + 0.5 * element["steel_b3"] * Math.sin(θ),
            0
          )
        );
        list.position = new THREE.Vector3(x, y, z);

        break;
      case 4:
        x =
          0.5 * element["steel_h1"] * Math.sin(θ) +
          element["steel_w1"] -
          0.5 * element["steel_b2"] * Math.cos(θ) +
          (element["steel_b2"] + 2 * tan1) / 2 -
          element["steel_w4"];
        y =
          Math.tan(θ) *
            (element["steel_w1"] -
              0.5 * element["steel_h1"] * Math.sin(θ) -
              0.5 * element["steel_b2"] * Math.cos(θ)) -
          element["steel_h1"] * Math.cos(θ) -
          element["steel_h2"] +
          0.5 * element["steel_b2"] * Math.sin(θ);
        z = 0;

        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(element["steel_b4"], 0, 0));
        list.vertice.push(
          new THREE.Vector3(element["steel_b4"], -element["steel_h4"], 0)
        );
        list.vertice.push(new THREE.Vector3(0, -element["steel_h4"], 0));
        list.position = new THREE.Vector3(x, y, z);

        break;
    }
    // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
    return list;
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
