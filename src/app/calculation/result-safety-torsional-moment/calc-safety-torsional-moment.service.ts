import { SaveDataService } from "../../providers/save-data.service";
import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";

import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputSafetyFactorsMaterialStrengthsService } from "src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service";
// import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
import { absoluteFrom } from "@angular/compiler-cli/src/ngtsc/file_system";
import { CalcVmuService } from "../result-calc-page/calc-vmu.service";
import { InputCrackSettingsService } from "src/app/components/crack/crack-settings.service";

@Injectable({
  providedIn: "root",
})
export class CalcSafetyTorsionalMomentService {
  // 安全性（破壊）ねじりモーメント
  public DesignForceList: any[];
  public isEnable: boolean;
  public safetyID: number = 1;

  constructor(
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private save: SaveDataService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private calc: InputCalclationPrintService,
    private vmu: CalcVmuService,
    private basic: InputBasicInformationService,
    private crack: InputCrackSettingsService,
  ) {
    this.DesignForceList = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void {
    this.isEnable = false;

    this.DesignForceList = new Array();

    // // ねじりモーメントが計算対象でない場合は処理を抜ける
    // if (this.calc.print_selected.calculate_torsional_moment === false) {
    //   return;
    // }

    const No5 = this.save.isManual()
      ? 5
      : this.basic.pickup_torsional_moment_no(5);
    this.DesignForceList = this.force.getDesignForceList("Mt", No5);
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable(
      "Mt",
      this.safetyID,
      this.DesignForceList
    );

    // POST 用
    const option = {};

    // 曲げ Mud 用
    const postData1 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force[0]
    );

    // 曲げ Mud' 用
    const force2 = JSON.parse(JSON.stringify({ temp: force[0] })).temp;
    for (const d1 of force2) {
      for (const d2 of d1.designForce) {
        d2.side = d2.side === "上側引張" ? "下側引張" : "上側引張"; // 上下逆にする
      }
    }
    const postData2 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force2
    );
    for (const d1 of postData2) {
      d1.side =
        d1.side === "上側引張" ? "下側引張の反対側" : "上側引張の反対側"; // 逆であることを明記する
      d1.memo = "曲げ Mud' 用";
    }

    // せん断 Mu 用
    const postData3 = this.post.setInputData(
      "Vd",
      "耐力",
      this.safetyID,
      option,
      force[0]
    );
    for (const d1 of postData3) {
      d1.Nd = 0.0;
      d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
      d1.memo = "せん断 Mu 用";
    }

    // POST 用
    const postData = postData1.concat(postData2, postData3);
    return postData;
  }

  public getSafetyFactor(target: string, g_id: any, safetyID: number) {
    return this.safety.getCalcData(target, g_id, safetyID);
  }

  // 変数の整理と計算
  public calcMtud(
    OutputData: any,
    res1: any,
    sectionM: any,
    sectionV: any,
    fc: any,
    safetyM: any,
    safetyV: any,
    Laa: number,
    force: any,
    omit_flg = false // 検討省略する場合でも以降の計算を続けるか？
  ) {
    // 曲げ Mud' 用
    const res2 = OutputData.find(
      (e) => e.index === res1.index && e.side === res1.side + "の反対側"
    );

    // せん断 Mu 用
    const res3 = OutputData.find(
      (e) => e.index === -1 * res1.index && e.side === res1.side
    );

    let result = {};
    if (!(res3 === undefined || res3.length < 1)) {
      result = this.vmu.calcVmu(res3, sectionV, fc, safetyV, null, force);
    }else{
      result["Md"] = 0;
      result["Nd"] = 0;
      result["Vd"] = 0;
    }

    if (force === void 0) {
      return result;
    }

    if (!('Mt' in force)) {
      return result;
    }
    let Mt: number = this.helper.toNumber(force.Vd);
    if (Mt === null) {
      Mt = 0;
    }
    Mt = Math.abs(Mt);
    result["Mt"] = Mt;

    // 部材係数
    const rb_T: number = safetyM.safety_factor.rb_T;
    const rb_C: number = safetyM.safety_factor.rb_C;
    const rb_S: number = safetyM.safety_factor.rb_S;
    const rs: number = safetyM.safety_factor.rs;
    const ri: number = safetyM.safety_factor.ri;
    // result["rb_T"] = rb_T;
    // result["rb_C"] = rb_C;
    // result["rb_S"] = rb_S;
    result['gamma_b1'] = rb_T;
    result['gamma_b2'] = rb_C;
    result["gamma_i"] = ri;
    result["rs"] = rs;

    let Nd: number = this.helper.toNumber(force.Nd);
    if (Nd === null) {
      Nd = 0;
    }
    Nd = Math.abs(Nd);
    result['Nd'] = Nd;

    let Md: number = this.helper.toNumber(force.Md);
    if (Md === null) {
      Md = 0;
    }
    Md = Math.abs(Md);
    const Mxd = Md;
    const Myd = 0;
    result['Mxd'] = Mxd;
    result['Myd'] = Myd;

    let Vd: number = this.helper.toNumber(force.Vd);
    if (Vd === null) {
      Vd = 0;
    }
    Vd = Math.abs(Vd);
    result['Vd'] = Vd;

    let tension: any;
    let compress: any;
    let shear1: any;
    let shear2: any;
    // 部材の整理 I型のみの対応
    if (sectionM.shapeName === 'I')  {
      if (force.side.includes('下側')) {
        tension = sectionM.steels['3'];
        compress = sectionM.steels['1'];
        shear1   = sectionM.steels['2'];
      } else {
        tension = sectionM.steels['1'];
        compress = sectionM.steels['3'];
        shear1   = sectionM.steels['2'];
      }
    } else if (sectionM.shapeName === 'Box') {
      if (force.side.includes('下側')) {
        tension = sectionM.steels['4'];
        compress = sectionM.steels['1'];
        shear1   = sectionM.steels['2'];
        shear1   = sectionM.steels['3'];
      } else {
        tension = sectionM.steels['1'];
        compress = sectionM.steels['4'];
        shear1   = sectionM.steels['2'];
        shear1   = sectionM.steels['3'];
      }

    }
    const A = sectionM.steels.A;
    const Ix = sectionM.steels.Ix;
    const Iy = sectionM.steels.Iy;
    const dim = sectionM.steels.dim;

    const crackInfo = this.crack.getCalcData(res1.index);

    // 緒元の計算
    const Lz: number = this.helper.toNumber(sectionM.member.eff_len) * 1000;
    const Ly: number = this.helper.toNumber(sectionM.member.eff_len) * 1000;

    // memo: 左上の外内, 右上の外内, 左下の外内, 右下の外内
    // memo: I型のときは内側がない
    const b1Lz = tension.steel_w / Lz;
    const b2Lz = (shear1.steel_w / 2) / Lz;// 本来は中立軸で分離(/2ではない)
    const tf: number = tension.steel_h / 2 + compress.steel_h / 2
    const b1Ly = ((shear1.steel_h + tf) / 2 ) / Ly;
    let lambda1: number;
    let lambda2: number;
    let lambda3: number;
    // 部材区間によってフランジの有効幅が変化するため分岐
    if (crackInfo.section === 1 || crackInfo.section === 5) {
      // 式(6.2.3)を使用する
      if (b1Lz <= 0.05) {
        lambda1 = tension.steel_w;
      } else {
        lambda1 = ( 1.1 - 2 * b1Lz ) * tension.steel_w;
      }
      if (b2Lz <= 0.05) {
        lambda2 = tension.steel_w;
      } else {
        lambda2 = ( 1.1 - 2 * b2Lz ) * shear1.steel_w / 2;
      }
      if (b1Ly <= 0.05) {
        lambda3 = tension.steel_w;
      } else {
        lambda3 = ( 1.1 - 2 * b1Ly ) * ((shear1.steel_h + tf) / 2 );
      }
    } else {
      // 式(6.2.4)を使用する
      if (b1Lz <= 0.02) {
        lambda1 = tension.steel_w;
      } else {
        lambda1 = (1.06 - 3.2 * b1Lz + 4.5 * b1Lz ** 2) * tension.steel_w;
      }
      if (b2Lz <= 0.02) {
        lambda2 = tension.steel_w;
      } else {
        lambda2 = (1.06 - 3.2 * b2Lz + 4.5 * b2Lz ** 2) * shear1.steel_w / 2;
      }
      if (b1Ly <= 0.02) {
        lambda3 = tension.steel_w;
      } else {
        lambda3 = (1.06 - 3.2 * b1Ly + 4.5 * b1Ly ** 2) * ((shear1.steel_h + tf) / 2 );
      }
    }
    lambda1 = Math.round(lambda1);
    if (lambda1 >= 0.15*Ly) {
      lambda1 = 0.15*Ly;
    }
    lambda2 = Math.round(lambda2);
    if (lambda2 >= 0.15*Ly) {
      lambda2 = 0.15*Ly;
    }
    lambda3 = Math.round(lambda3);
    if (lambda3 >= 0.15*Ly) {
      lambda3 = 0.15*Ly;
    }
    const Lz_b = 2 * lambda1 + 2 * lambda2;
    const Ly_b = 2 * lambda3 - tf; 



    // 5.4.1 板要素の耐荷性の照査
    // (1) 上フランジ
    // (2) 下フランジ
    const bt_tension = ((tension.steel_b - shear1.steel_b) / 2) / tension.steel_h;
    const bto_tension = 16;
    result['bt_tension'] = bt_tension;
    result['bto_tension'] = bto_tension;
    // (3) 腹板
    const dt_shear = shear1.steel_h / shear1.steel_b;
    const dto_shear = 67.9;
    result['dt_shear'] = dt_shear;
    result['dto_shear'] = dto_shear;

    // 5.4.2 設計限界値の算定
    // (1) 圧縮側
    const rho_bg: number = 1.0;
    result['rho_bg_culc'] = rho_bg;
    const rho_bl: number = 1.0;
    result['rho_bl_culc'] = rho_bl;

    const fsyk_compress = compress['fsy']['fsyk'];
    const fsyd_compress: number = fsyk_compress / rs;
    result['fsyk_compress'] = fsyk_compress;
    ////////// AfnとAfgが区別できていない //////////
    const Mucd1 = rho_bg
                * ( Ix / dim['yc'] )
                * fsyd_compress
                * ( dim['Afnu'] / dim['Afgu'] )
                / rb_C / 1000 / 1000;
    const Mucd2 = rho_bl
                * ( Ix / dim['yc'] )
                * fsyd_compress
                * ( dim['Afnu'] / dim['Afgu'] )
                / rb_C / 1000 / 1000;
    result['Mucxd'] = Mucd1;
    result['Mucyd'] = 0;
    // (2) 引張側
    const fsyk_tension = tension['fsy']['fsyk'];
    const fsyd_tension: number = fsyk_tension / rs;
    result['fsyk_tension'] = fsyk_tension;
    const Mutd1: number = ( Ix / dim['yt'] )
                        * fsyd_tension 
                        * ( dim['Afnl'] / dim['Afgl'] )
                        / rb_T / 1000 / 1000;
    const Mutd2: number = ( Ix / ( dim['yt'] - tension['steel_h'] ) )
                        * fsyd_tension
                        * ( dim['Afnl'] / dim['Afgl'] )
                        / rb_T / 1000 / 1000;
    result['Mutxd'] = Mutd1;
    result['Mutyd'] = 0;
    // (3) 設計曲げ耐力
    const Mud: number = Math.min(Mucd1, Mucd2, Mutd1, Mutd2);
    // const Mud: number = Mutd2;

    // (4) 設計せん断力
    const Aw: number = dim['Aw'];
    result['An'] = dim['Aw'] + dim['Afgu'] + dim['Afgl'];
    const fsvyk_web: number = shear1['fsy']['fsvyk'];
    const fsvyd = fsvyk_web / rb_S;
    result['fsvyk_web'] = fsvyk_web;
    const Vyd: number = Aw * fsvyd / rs / 1000;
    result['Vyd'] = Vyd;
    
    // 照査
    const ratio_M_compress = ri * Mxd / Mutd1;
    const ratio_M_tension = ri * Mxd / Mutd1;
    result['ratio_M_compress'] = ratio_M_compress;
    result['ratio_M_tension'] = ratio_M_tension;
    const ratio_VT_web = ri * Vd / Vyd;
    result['ratio_VT_web'] = ratio_VT_web;
    const ratio_MV_web_u = (ri / 1.1)**2 * ( (Md / Mud)**2 + (Vd / Vyd)**2 );
    const ratio_MV_web_l = (ri / 1.1)**2 * ( (Md / Mud)**2 + (Vd / Vyd)**2 );
    result['ratio_MV_web_u'] = ratio_MV_web_u;
    result['ratio_MV_web_l'] = ratio_MV_web_l;

    return result;
  }

}
