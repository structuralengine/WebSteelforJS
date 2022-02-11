import { Injectable } from '@angular/core';
import { InputBarsService } from 'src/app/components/bars/bars.service';
import { InputSteelsService } from 'src/app/components/steels/steels.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { environment } from 'src/environments/environment';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class SetBoxService {

  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) { }

  // 矩形断面の POST 用 データ作成
  public getBox(
    target: string, member: any, index: number,
    side: string, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getBoxShape(member, target, index, side, safety, option)
    const h: number = shape.H;
    const b: number = shape.B;

    const section = {
      Height: h, // 断面高さ
      WTop: b,        // 断面幅（上辺）
      WBottom: b,     // 断面幅（底辺）
      ElasticID: 'c'  // 材料番号
    };
    result.Concretes.push(section);
    result['member'] = shape;

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsection(
    target: string, member: any, index: number,
    side: string, safety: any, option: any): object {

    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
    };
    result.Concretes.push(section1);

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
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
    target: string, member: any, index: number,
    side: string, safety: any, option: any): object {

    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
    };
    result.Concretes.push(section2);

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
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
      H: null,
      B: null,
      Bt: null,
      t: null,
      tan: null,
      member:null,
    };


    return result
  }

  public getTSection(member: any, target: string, index: number) {

    const result = this.getSection(member, target, index);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result
  }

  // 断面の幅と高さ（フランジ幅と高さ）を取得する
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getBoxShape(
    member: any, target: string, index: number,
    side: string, safety: any, option: any): any {

    const result = this.getSection(member, target, index);

    const stl: any = this.steel.getCalcData(index); // 鉄骨


    // steel
    const steel = {
      A: null, 
      rs: null
    };
    for (const num of Object.keys(stl)) {
      const n = this.helper.toNumber(num);
      if (n !== null) {
        steel[n] = {
          title: stl[num].title,
          steel_b: null,
          steel_h: null,
          steel_w: null,
          fsy: null,
        }
      }
    }

    if(stl !== null){

      steel.rs = safety.safety_factor.S_rs;

      let A: number = 0;
      // 1~5を入手
      for (const num of Object.keys(steel)) {
        if (num === 'rs' || num === 'A') continue;
        const steel0 = steel[num];
        for (const key of ['steel_b', 'steel_h', 'steel_w']) {
          steel0[key] = stl[num][key];
        }
        // 断面積を算出し, 加算する
        A += steel0['steel_b'] * steel0['steel_h'];
        // 鉄骨強度を入手し, fsyに入れる
        // steel0['fsy'] = this.helper.getFsyk2(stl[num]upper_thickness, safety.material_steel);
        steel0['fsy'] = 235;  // 鉄骨幅は部材ナンバーごとに異なるため、一旦保留
      }
      // 断面積を代入
      steel.A = A;
      console.log("break")
    }

    result['steel'] = steel;


    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsectionShape(
    member: any, target: string, index: number,
    side: string, safety: any, option: any): any {

    const result = this.getBoxShape(member, target, index, side, safety, option);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result;
  }

  // 矩形、Ｔ形断面における 鉄骨情報を生成する関数
  private getSteel(section: any, side: string): any {
    const result = {
      Steels: new Array(),
      SteelElastic: new Array(),
    };

    let defaultID = 'st';

    // I 鉄骨の入力 ---------------------------------------------------
    const I: any = {
      UpperT: section.steel.I.compress_thickness,
      UpperW: section.steel.I.compress_width,
      BottomT: section.steel.I.tension_thickness,
      BottomW: section.steel.I.tension_width,
      WebT: section.steel.I.web_thickness,
      WebH: section.steel.I.web_height,
    }

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
      I['Df'] = this.helper.toNumber(section.steel.I.position);
      if (I['Df'] === null) {
        I['Df'] = 0;
      }

      const sectionI = [];

      // かぶり部分
      if (I.Df > 0) {
        // 最初の1つめ の鉄骨材料を登録する
        for(const fsy of [section.steel.I.fsy_tension.fsy, section.steel.I.fsy_compress.fsy, section.steel.I.fsy_web.fsy,
                          section.steel.H.fsy_left.fsy, section.steel.H.fsy_right.fsy,section.steel.H.fsy_web.fsy ]){
          if (this.helper.toNumber(fsy) !== null) {
            result.SteelElastic.push({
              ElasticID: defaultID,
              Es: 200,
              fsk: section.steel.I.fsy_tension.fsy,
              rs: section.steel.rs
            });
            break;
          }
        }
        sectionI.push({
          Height: I.Df,  // 断面高さ
          WTop: 0,        // 断面幅（上辺）
          WBottom: 0,     // 断面幅（底辺）
          ElasticID: defaultID // 材料番号
        })
      }

      // 圧縮側フランジ
      if(result.SteelElastic.length === 0) defaultID = 'sc';
      if (I.UpperT > 0) {
        const fsk = section.steel.I.fsy_compress.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.UpperT,  // 断面高さ
          WTop: I.UpperW,        // 断面幅（上辺）
          WBottom: I.UpperW,     // 断面幅（底辺）
          ElasticID
        })
      }

      // 腹板
      if(result.SteelElastic.length === 0) defaultID = 'sw';
      if (I.WebH > 0) {
        const fsk = section.steel.I.fsy_web.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.WebH,  // 断面高さ
          WTop: I.WebT,        // 断面幅（上辺）
          WBottom: I.WebT,     // 断面幅（底辺）
          ElasticID: ElasticID // 材料番号
        })
      }

      // 引張側フランジ
      if(result.SteelElastic.length === 0) defaultID = 'st';
      if (I.BottomT > 0) {
        const fsk = section.steel.I.fsy_tension.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.BottomT,  // 断面高さ
          WTop: I.BottomW,        // 断面幅（上辺）
          WBottom: I.BottomW,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })

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
    }
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
        H['LeftDf'] = 0;
        H['RightDf'] = 0;
      } else {
        H['LeftDf'] = Df;
        H['RightDf'] = Df;
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
      if(result.SteelElastic.length === 0) defaultID = 'sl';
      const HsectionLeft = [];
      if (H.LeftT > 0) {
        // かぶり部分
        if (H.LeftDf > 0) {
          HsectionLeft.push({
            Height: H.LeftDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_left.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: defaultID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 左フランジ
        HsectionLeft.push({
          Height: H.LeftW,  // 断面高さ
          WTop: H.LeftT,        // 断面幅（上辺）
          WBottom: H.LeftT,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionLeft);
      }
      // H 鉄骨の右側フランジ ---------------------------------------------------
      if(result.SteelElastic.length === 0) defaultID = 'sr';
      const HsectionRight = [];
      if (H.RightT > 0) {
        // かぶり部分
        if (H.RightDf > 0) {
          HsectionRight.push({
            Height: H.RightDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_right.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 右フランジ
        HsectionRight.push({
          Height: H.RightW,  // 断面高さ
          WTop: H.RightT,        // 断面幅（上辺）
          WBottom: H.RightT,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionRight);
      }
      // H 鉄骨のウェブ ----------------------------------------------------------
      if(result.SteelElastic.length === 0) defaultID = 'sw';
      const HsectionWeb = [];
      if (H.WebT > 0) {
        // かぶり部分
        if (H.WebDf > 0) {
          HsectionWeb.push({
            Height: H.WebDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_web.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e === undefined) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // ウェブ
        HsectionWeb.push({
          Height: H.WebT,  // 断面高さ
          WTop: H.WebH,        // 断面幅（上辺）
          WBottom: H.WebH,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionWeb);
      }
    }
    return result;

  }


}
