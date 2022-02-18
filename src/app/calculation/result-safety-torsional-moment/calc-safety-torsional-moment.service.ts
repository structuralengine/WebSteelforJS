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

@Injectable({
  providedIn: "root",
})
export class CalcSafetyTorsionalMomentService {
  // 安全性（破壊）ねじりモーメント
  public DesignForceList: any[];
  public isEnable: boolean;
  public safetyID: number = 2;

  constructor(
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private save: SaveDataService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private calc: InputCalclationPrintService,
    private vmu: CalcVmuService,
    private basic: InputBasicInformationService
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
    const Mt = Math.abs(force.Mt);
    result["Mt"] = Mt;

    // 部材係数
    // const resultData1 = res1.Reactions[0];
    // const resultData2 = res2.Reactions[0];
    // const safetyM_factor = safetyM.safety_factor;
    const safetyV_factor = safetyV.safety_factor;

    // const M_rb: number = safetyM_factor.M_rb;
    const V_rbc: number = safetyV_factor.V_rbc;
    const V_rbs: number = safetyV_factor.V_rbs;
    const T_rbt: number = safetyV_factor.T_rbt;
    result["T_rbt"] = T_rbt;
    result["V_rbc"] = V_rbc;
    result["V_rbs"] = V_rbs;

    let Nd: number = this.helper.toNumber(force.Nd);
    if (Nd === null) {
      Nd = 0;
    }

    let Md: number = this.helper.toNumber(force.Md);
    if (Md === null) {
      Md = 0;
    }
    Md = Math.abs(Md);

    let Vd: number = this.helper.toNumber(force.Vd);
    if (Vd === null) {
      Vd = 0;
    }
    Vd = Math.abs(Vd);

    // 5.4.1 板要素の耐荷性の照査
    // (1) 上フランジ
    // (2) 下フランジ
    /* const bt_upper = (( sectionM.steels['3']['steel_b'] - sectionM.steels['2']['steel_b'] ) / 2)
                   / sectionM.steels['3']['steel_h']; */
    // (3) 腹板

    // 5.4.2 設計限界値の算定
    // (1)
    const rho_bg: number = 1.0;
    const rho_bl: number = 1.0;
    const fsyk_upper = sectionM.steels['1']['fsy']['fsyk'];
    const fsyd_upper: number = fsyk_upper / /* safetyM.safety_factor.M_rs */1.05;
    ////////// AfnとAfgが区別できていない //////////
    const Mucd1 = rho_bg
                * ( sectionM.steels['Ix'] / sectionM.steels['dim']['yc'] )
                * fsyd_upper
                * ( sectionM.steels['dim']['Afnu'] / sectionM.steels['dim']['Afgu'] )
                / /* safetyM.safety_factor.M_rb */1.1 / 1000 / 1000;
    const Mucd2 = rho_bl
                * ( sectionM.steels['Ix'] / sectionM.steels['dim']['yc'] )
                * fsyd_upper
                * ( sectionM.steels['dim']['Afnu'] / sectionM.steels['dim']['Afgu'] )
                / /* safetyM.safety_factor.M_rb */1.1 / 1000 / 1000;
    // (2)
    const fsyk_lower = sectionM.steels['3']['fsy']['fsyk'];
    const fsyd_lower: number = fsyk_lower / /* safetyM.safety_factor.M_rs */1.05;
    const Mutd1: number = ( sectionM.steels['Ix'] / sectionM.steels['dim']['yt'] )
                        * fsyd_lower 
                        * ( sectionM.steels['dim']['Afnl'] / sectionM.steels['dim']['Afgl'] )
                        / /* safetyM.safety_factor.M_rb */1.05 / 1000 / 1000;
    const Mutd2: number = ( sectionM.steels['Ix'] / ( sectionM.steels['dim']['yt'] - sectionM.steels['3']['steel_h'] ) )
                        * fsyd_lower 
                        * ( sectionM.steels['dim']['Afnl'] / sectionM.steels['dim']['Afgl'] )
                        / /*safetyM.safety_factor.M_rb */1.05 / 1000 / 1000;
    // (3) 設計曲げ耐力
    const Mud: number = Math.min(Mucd1, Mucd2, Mutd1, Mutd2);

    // (4) 設計せん断力
    const Aw: number = sectionM.steels['dim']['Aw'];
    const fsvyd: number = sectionM.steels['2']['fsy']['fsvyk'] / /* safetyM.safety_factor.S_rb */1.05;
    const Vyd: number = Aw * fsvyd / /* safetyM.safety_factor.S_rs */1.05 / 1000;
    
    // 照査
    const ri = /* safetyM.safety_factor.ri */1.2;
    const M_lower_ratio = ri * Md / Mutd1;
    const Vyd_Ratio = ri * Vd / Vyd;
    const M_V_ratio = (ri / 1.1)**2 * ( (Md / Mud)**2 + (Vd / Vyd)**2 );

    return result;
  }

}
