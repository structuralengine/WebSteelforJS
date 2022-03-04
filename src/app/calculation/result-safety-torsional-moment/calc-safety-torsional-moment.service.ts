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
import { SetParamService } from "../shape-data/set-param.service";
import { sign } from "crypto";

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
    private param: SetParamService,
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
    let Mt: number = this.helper.toNumber(force.Mt);
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
    // Nd = Math.abs(Nd);
    result['Nd'] = Math.abs(Nd);

    let Md: number = this.helper.toNumber(force.Md);
    if (Md === null) {
      Md = 0;
    }
    // Md = Math.abs(Md);
    const Mxd = Math.abs(Md);
    const Myd = 0;
    result['Mxd'] = Mxd;
    result['Myd'] = Myd;

    let Vd: number = this.helper.toNumber(force.Vd);
    if (Vd === null) {
      Vd = 0;
    }
    // Vd = Math.abs(Vd);
    result['Vd'] = Math.abs(Vd);;

    let tension: any;
    let compress: any;
    let shear1: any;
    let shear2: any;
    // 部材の整理 I型, Box型のみの対応
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
        shear2   = sectionM.steels['3'];
      } else {
        tension = sectionM.steels['1'];
        compress = sectionM.steels['4'];
        shear1   = sectionM.steels['2'];
        shear2   = sectionM.steels['3'];
      }

    }

    const crackInfo = this.crack.getCalcData(res1.index);

    // 座屈長の計算
    const lambda_list = this.calcEffectiveWidth(sectionM, compress, tension, shear1, shear2, crackInfo.section)

    // 緒元の計算
    const Lz: number = this.helper.toNumber(sectionM.member.eff_len) * 1000;
    const Ly: number = this.helper.toNumber(sectionM.member.eff_len) * 1000;

    /* // memo: 左上の外内, 右上の外内, 左下の外内, 右下の外内
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
    const lambda_list_1: number[] = [lambda1, lambda2, lambda3]; */
    // const Lz_b = 2 * lambda1 + 2 * lambda2;
    const tf: number = tension.steel_h / 2 + compress.steel_h / 2
    let Lz_b: number = 0;
    if (sectionM.shapeName === 'I') {
      Lz_b = lambda_list.x['lambda1'] 
            + lambda_list.x['lambda4'];
    } else if (sectionM.shapeName === 'Box') {
      Lz_b = lambda_list.x['lambda1'] 
            + lambda_list.x['lambda1'] 
            + lambda_list.x['lambda1'] 
            + lambda_list.x['lambda4'];
    }
    const Ly_b = 2 * lambda_list.y['lambda1'] - tf; 

    // 断面性能
    //// 総断面
    const A = sectionM.steels.A;
    const Ix = sectionM.steels.Ix;
    const Iy = sectionM.steels.Iy;
    const dim = sectionM.steels.dim;
    const E: number = 2.0 * 10**5;
    const rx = ( Ix / A ) ** 0.5;
    const ry = ( Iy / A ) ** 0.5;
    //  軸方向回転時有効断面
    let vertices: any
    let param = {};
    let centroid: THREE.Vector3;
      // 頂点座標を再取得してparamを計算
    vertices = this.param.getVertices_fixed(sectionM, lambda_list);
    centroid = this.param.getCentroid(vertices);
    param = this.param.getSectionParam(vertices, centroid);

    const yu = centroid.y;
    const Zzu = param['Ix'] / yu;
    const yuw = compress['steel_h'] + centroid.y;
    const Zzuw = param['Ix'] / yuw;
    const ylw = tension['steel_h'] + shear1['steel_h'] + centroid.y;
    const Zzlw = param['Ix'] / ylw;
    const yl = tension['steel_h'] + shear1['steel_h'] + compress['steel_h'] + centroid.y;
    const Zzl = param['Ix'] / yl;
    const param_sec = {A, yu, Zzu, yuw, Zzuw, ylw, Zzlw, yl, Zzl};


    // 5.4.1 板要素の耐荷性の照査
    const param_val = {Nd, Myd: 0, Mzd: Md};
    const sigma_N = (Nd > 0) ? 0: Nd * 1000 / A;
    const sigma_My1 = 0;
    const sigma_My2 = 0;
    const sigma_Mz1 = Md * 1000 * 1000 / Zzu;
    const sigma_Mz2 = Md * 1000 * 1000 / Zzl;
    const sigma_list = {sigma_N, sigma_My1, sigma_My2, sigma_Mz1, sigma_Mz2};
    // const sigmasigma1 = sigma_N + sigma_My1 + sigma_Mz1;
    // const sigmasigma2 = sigma_N + sigma_My2 + sigma_Mz1;
    // const sigmasigma3 = sigma_N + sigma_My1 + sigma_Mz2;
    // const sigmasigma4 = sigma_N + sigma_My2 + sigma_Mz2;
    // const sigmasigmas = [ [sigmasigma1, sigmasigma2], [sigmasigma3, sigmasigma4] ];
    // const sigmasigmas1 = [sigmasigma1, sigmasigma2];
    // const sigmasigmas2 = [sigmasigma3, sigmasigma4];

    // 
    // (1) 上フランジ
    // (2) 下フランジ
    // (3) 腹板
    const bto_list = this.calcBtoDto( {tension, compress, shear1, shear2}, 
                                      param_sec, 
                                      param_val,
                                      sectionM.shapeName);
    for (const key of Object.keys(bto_list)) {
      result[key] = bto_list[key]
    }

    // 5.4.2 設計限界値の算定
    // 軸方向圧縮耐力
    const Lzrz = Lz / rx;
    const Lyry = Ly / ry;
    /* for (const flange of [compress, tension]) {
      const key: string = (flange === compress) ? '_compress': '_tension'; 
      // rho_bg(rho_bg_N)の計算
      // minusは引張、plusは圧縮
      const lambda: number = (Mxd > Myd)
                          ? 1 / Math.PI * (flange.fsy.fsyk / E)**0.5 * Lzrz
                          : 1 / Math.PI * (flange.fsy.fsyk / E)**0.5 * Lyry;
      let rho_bg_Nplus: number;
      if (lambda <= 0.1) {
        rho_bg_Nplus = 1.0;
      } else if (0.1 < lambda && lambda <= 2**0.5) {
        rho_bg_Nplus = 1.0 - 0.53 * (lambda - 0.1);
      } else {
        rho_bg_Nplus = 1.7 / (2.8 * lambda ** 2);
      }
      let rho_bg_Nminus: number = 1.0;
      result['rho_bg_Nplus' + key] = rho_bg_Nplus;
      result['rho_bg_Nminus' + key] = rho_bg_Nminus;

      // rho_bl(rho_bl_N)の計算は、
      // 幅厚比の照査で完了しているため省略.
      const rb = (key === '_compress') ? rb_C : rb_T;
      const fsy = flange.fsy.fsyk / rs;
      const rho_bl_minus: number = 1.0;
      const rho_bl_plus = result['rho_bl' + key];
      const Nud_minus = rho_bg_Nminus * rho_bl_minus * A * fsy / rb_T / 1000;
      const Nud_plus = rho_bg_Nplus * rho_bl_plus * A * fsy / rb_C / 1000;
      const Noud2 = rho_bg_Nplus * rho_bl_plus * A * fsy / rb_C / 1000;
      result['Nud'] = Nud_minus;
      result['Nuod'] = Nud_plus;
      result['Nuod2'] = Noud2;

    } */
    // rho_bg(rho_bg_N)の計算
    // minusは引張、plusは圧縮
    let rho_bg_Nplus: number;
    if (Lzrz === 0 && Lyry === 0) {
      rho_bg_Nplus = 1.0;
    } else {
      const lambda: number = (Mxd > Myd)
                          ? 1 / Math.PI * (compress.fsy.fsyk / E)**0.5 * Lzrz
                          : 1 / Math.PI * (compress.fsy.fsyk / E)**0.5 * Lyry;
      if (lambda <= 0.1) {
        rho_bg_Nplus = 1.0;
      } else if (0.1 < lambda && lambda <= 2**0.5) {
        rho_bg_Nplus = 1.0 - 0.53 * (lambda - 0.1);
      } else {
        rho_bg_Nplus = 1.7 / (2.8 * lambda ** 2);
      }
    }
    let rho_bg_Nminus: number = 1.0;
    result['rho_bg_Nplus'] = rho_bg_Nplus;
    result['rho_bg_Nminus'] = rho_bg_Nminus;
    // rho_bl(rho_bl_N)の計算は、
    // 幅厚比の照査で完了しているため省略.
    const rho_bl_minus: number = 1.0;
    const rho_bl_plus = result['rho_bl0'];
    const Nud_minus = rho_bg_Nminus * rho_bl_minus * A * (tension.fsy.fsyk / rs) / rb_T / 1000;
    const Nud_plus = rho_bg_Nplus * rho_bl_plus * A * (compress.fsy.fsyk / rs) / rb_C / 1000;
    const Noud2 = rho_bg_Nplus * rho_bl_plus * A * (compress.fsy.fsyk / rs) / rb_C / 1000;
    result['Nud'] = Nud_minus;
    result['Nuod'] = Nud_plus;
    result['Nuod2'] = Noud2;


    // 設計曲げ圧縮耐力（z軸(x軸)まわり）
    const alpha: number = compress.steel_h / shear1.steel_b;
    const beta: number = shear1.steel_h / compress.steel_b;
    const betao: number = (14 + 12 * alpha) / (5 + 21 * alpha);
    const bl = compress.steel_b / Lz;
    let F: number;
    if (beta < betao) {
      F = 0;
    } else if (betao <= beta && beta < 1) {
      F = (1.05*(beta-betao)/(1-betao))*(3*alpha+1) ** 0.5 * bl ** 0.5;
    } else if (1 <= beta && beta < 2) {
      F = 0.74*((3*alpha+beta)*(beta+1)) ** 0.5 * bl ** 0.5
    } else {
      F = 1.28 * (3*alpha+beta) ** 0.5 * bl * 0.5
    }
    const lambda_e: number = 1 / Math.PI * (compress.fsy.fsyk / E)**0.5 * (F * (1 / bl));
    result['lambda_e'] = lambda_e;
    let rho_bg_culc: number;
    if (lambda_e <= 0.1) {
      rho_bg_culc = 1.0;
    } else if (0.1 < lambda_e && lambda_e <= 2 ** 0.5) {
      rho_bg_culc = 1.0 - 0.53*(lambda_e - 0.1);
    } else {
      rho_bg_culc = 1.7 / (2.8 * lambda_e ** 2)
    }
    let rho_bl_culc: number = 1.0;
    for (const flange of [compress, tension]) {
      const nu: number = 0.3;
      const bt = shear1['steel_w'] / flange['steel_h'];
      const Rcr = (flange.lib_n <= 0) ? 0.7 : 0.5;
      const bto = Rcr * ((Math.PI * 4) / (12*(1-nu**2)) * E / flange.fsy.fsyk) ** 0.5;
      let kai: any;
      if (bt < bto) {
        kai = '-';
      } else {
        if (flange.lib_n <= 0) {
          kai = 1.2;
        } else {
          kai = 1.7;
        }
      }
      let Rr: any = '-';
      if (kai === '-') {
        Rr = bt * ((Math.PI * 4) / (12*(1-nu**2)) * E / flange.fsy.fsyk) ** 0.5;
      }

      let rho_bl;
      if (kai === '-') {
        rho_bl = 1.0;
      } else {
        if (flange.lib_n <= 0) {
          rho_bl = 0.49 / (Math.max(0.7,Rr)**2)
        } else if (Rr === '-') {
          rho_bl = 1.5 - Math.max(0.5,Rr);
        } else {
          rho_bl = 0.5 / (Rr**2);
        }
      }
      if (rho_bl_culc > rho_bl) {
        rho_bl_culc = rho_bl;
      }
    }
    const fsyk_compress = compress['fsy']['fsyk'];
    const fsyd_compress: number = fsyk_compress / rs;
    result['fsyk_compress'] = fsyk_compress;
    const Afg_compress = Lz_b * compress['steel_h'];
    const Afn_compress = Lz_b * compress['steel_h'];
    const Mucod = Math.min(rho_bg_culc, rho_bl_culc)
                * ( param['Ix'] / dim['yc'] )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000; 
    result['Mucod'] = Mucod;
    result['Mucd'] = Mucod;

    // (1) 圧縮側
    const rho_bg: number = 1.0;
    result['rho_bg_culc'] = rho_bg;
    const rho_bl: number = 1.0;
    result['rho_bl_culc'] = rho_bl;

    // const fsyk_compress = compress['fsy']['fsyk'];
    // const fsyd_compress: number = fsyk_compress / rs;
    // result['fsyk_compress'] = fsyk_compress;
    ////////// AfnとAfgが区別できていない //////////
    const Mucd1 = rho_bg
                * ( param['Ix'] / dim['yc'] )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000;
    const Mucd2 = rho_bl
                * ( param['Ix'] / dim['yc'] )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000;
    result['Mucxd'] = Mucd1;
    result['Mucyd'] = 0;

    // 設計曲げ引張耐力（z軸(x軸)まわり）
    // (2) 引張側
    const fsyk_tension = tension['fsy']['fsyk'];
    const fsyd_tension: number = fsyk_tension / rs;
    result['fsyk_tension'] = fsyk_tension;
    const Afg_tension = Lz_b * tension['steel_h'];
    const Afn_tension = Lz_b * tension['steel_h'];
    const Mutd1: number = ( param['Ix'] / dim['yt'] )
                        * fsyd_tension 
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000;
    const Mutd2: number = ( param['Ix'] / ( dim['yt'] - tension['steel_h'] ) )
                        * fsyd_tension
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000;
    const Mutod: number = ( param['Ix'] / dim['yt'] )
                        * fsyd_tension 
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000;
    result['Mutxd'] = Mutd1;
    result['Mutyd'] = 0;
    result['Mutod'] = Mutod;

    // 設計曲げ圧縮耐力（腹板／z軸廻り）

    const fsyk_shear: number = shear1['fsy']['fsyk'];
    const fsyd_shear: number = fsyk_shear / rs;
    result['fsyk_shear'] = fsyk_shear;
    const Mucwd: number = ( param['Ix'] / Math.abs(yuw/* ylw */) )
                        * fsyd_shear / rb_C / 1000 / 1000;
    result['Mucwd'] = Mucwd;
    
    // 設計曲げ引張耐力（腹板／z軸廻り）
    const Mutwd: number = ( param['Ix'] / Math.abs(yuw/* ylw */) )
                        * fsyd_shear / rb_T / 1000 / 1000;
    result['Mutwd'] = Mutwd;


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

    // 設計ねじり耐力（x軸廻り）
    //const fsvyd = 
    const At = (tension['steel_h']/2 + shear1['steel_h'] + compress['steel_h']/2)
             * (shear1['steel_w'] + shear1['steel_b']);
    result['At'] = At;
    const Mtuyd = 2 * At * shear1['steel_b'] * fsvyd / rb_T / 1000 / 1000;
    const Mtuzd = 2 * At * (tension['steel_h'] / 2 + compress['steel_h'] / 2) * fsvyd / rb_T / 1000 / 1000;
    result['Mtuyd'] = Mtuyd;
    result['Mtuzd'] = Mtuzd;
    
    // 曲げモーメントを受ける部材の照査（フランジの照査）
    const ratio_M_compress = ri * ( Mxd / Mucd1 );
    const ratio_M_tension = ri * ( Mxd / Mutd1 + Nd / Nud_minus );
    result['ratio_M_compress'] = ratio_M_compress;
    result['ratio_M_tension'] = ratio_M_tension;
    // せん断とねじりを受ける部材の照査（ウェブの照査）
    const ratio_VT_web = ri * (Math.abs(Vd / Vyd) + Math.abs(Mt / Mtuyd));
    result['ratio_VT_web'] = ratio_VT_web;
    // 曲げとせん断を受ける部材の照査（フランジの照査）
    const ratio_MV_tension_u = (ri / 1.1)**2 * ( (Md / Mud)**2 + (Vd / Vyd + Mt / Mtuzd)**2 );
    const ratio_MV_tension_l = (ri / 1.1)**2 * ( (Md / Mud + Nd / Nud_minus)**2 + (Vd / Vyd + Mt / Mtuzd)**2 );
    result['ratio_MV_tension_u'] = ratio_MV_tension_u;
    result['ratio_MV_tension_l'] = ratio_MV_tension_l;
    // 曲げとせん断を受ける部材の照査（ウェブの照査）
    // const case1 = (Nd > 0)
    //             ? ( (ri/1.1)**2 ) * ((         Nd / Nud_minus + Math.abs(Md / Mutwd))**2 + ((Math.abs(Vd / Vyd) + Math.abs(Mt / Mtuzd))**2))
    //             : ( (ri/1.1)**2 ) * ((Math.abs(Nd / Nud_plus) + Math.abs(Md / Mucwd))**2 + ((Math.abs(Vd / Vyd) + Math.abs(Mt / Mtuzd))**2));
    // const case2 = (Nd > 0)
    //             ? ( (ri/1.1)**2 ) * ((         Nd / Nud_minus - Math.abs(Md / Mucwd))**2 + ((Math.abs(Vd / Vyd) + Math.abs(Mt / Mtuzd))**2))
    //             : ( (ri/1.1)**2 ) * ((Math.abs(Nd / Nud_plus) - Math.abs(Md / Mutwd))**2 + ((Math.abs(Vd / Vyd) + Math.abs(Mt / Mtuzd))**2));
    // const ratio_MV_web = Math.max(case1, case2)
    // result['ratio_MV_web'] = ratio_MV_web;

    return result;
  }

  // 有効幅の計算
  private calcEffectiveWidth(section, compress, tension, shear1, shear2, sectionNo) {

    const eff_len: number = this.helper.toNumber(section.member.eff_len);
    let lambda1: number = 0;
    let lambda2: number = 0;
    let lambda3: number = 0;
    let lambda4: number = 0;
    let lambda5: number = 0;
    let lambda6: number = 0;
    let lambda7: number = 0;
    let lambda8: number = 0;
    let lambda11: number = 0;
    if (eff_len <= 0 || eff_len == undefined) {
      // 有効幅を考慮しない
      switch (section.shapeName) {
        
        case 'I':
          lambda1 = compress.steel_w;
          lambda2 = 0;
          lambda3 = 0;
          lambda4 = compress.steel_b - lambda1;
          lambda5 = tension.steel_w;
          lambda6 = 0;
          lambda7 = 0;
          lambda8 = tension.steel_b - lambda5;

          lambda11 = shear1.steel_h;
          break

        case 'Box':
          lambda1 = compress.steel_w;
          lambda2 = shear1.steel_w / 2; // 厳密には/2ではない. 中立軸に合わせた値
          lambda3 = shear1.steel_w - lambda2;
          lambda4 = compress.steel_b - (lambda1 + lambda2 + lambda3);
          lambda5 = tension.steel_w;
          lambda6 = shear2.steel_w / 2;
          lambda7 = shear2.steel_w - lambda6;
          lambda8 = tension.steel_b - (lambda5 + lambda6 + lambda7);
          lambda11 = shear1.steel_h;
          break
      }

      if (section.shapename === 'Box') {
      }
    } else {
      // 有効幅を考慮する
      // 緒元の計算
      const Lz: number = eff_len * 1000;
      const Ly: number = eff_len * 1000;

      // 等価支間長

      // memo: 左上の外内, 右上の外内, 左下の外内, 右下の外内
      // memo: I型のときは内側がない
      const b1Lz = tension.steel_w / Lz;
      const b2Lz = (shear1.steel_w / 2) / Lz;// 本来は中立軸で分離(/2ではない)
      const tf: number = tension.steel_h / 2 + compress.steel_h / 2
      const b1Ly = ((shear1.steel_h + tf) / 2 ) / Ly;
      // let lambda1: number;
      // let lambda2: number;
      // let lambda3: number;
      // 部材区間によってフランジの有効幅が変化するため分岐
      if (sectionNo === 1 || sectionNo === 5) {
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
          lambda11 = tension.steel_w;
        } else {
          lambda11 = ( 1.1 - 2 * b1Ly ) * ((shear1.steel_h + tf) / 2 );
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
          lambda11 = tension.steel_w;
        } else {
          lambda11 = (1.06 - 3.2 * b1Ly + 4.5 * b1Ly ** 2) * ((shear1.steel_h + tf) / 2 );
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
      lambda11 = Math.round(lambda11);
      if (lambda11 >= 0.15*Ly) {
        lambda11 = 0.15*Ly;
      }
      const Lz_b = 2 * lambda1 + 2 * lambda2;
      const Ly_b = 2 * lambda11 - tf; 
      // const lambda_list: number[] = [lambda1, lambda2, lambda3];

      // 一旦配置
      lambda3 = lambda2;
      lambda4 = lambda1;
      lambda5 = lambda1;
      lambda6 = lambda2;
      lambda7 = lambda2;
      lambda8 = lambda1;
      // 一旦配置ここまで
    }

    const lambda_list = { x: {}, y: {} };
    lambda_list.x['lambda1'] = lambda1;
    lambda_list.x['lambda2'] = lambda2;
    lambda_list.x['lambda3'] = lambda3;
    lambda_list.x['lambda4'] = lambda4;
    lambda_list.x['lambda5'] = lambda5;
    lambda_list.x['lambda6'] = lambda6;
    lambda_list.x['lambda7'] = lambda7;
    lambda_list.x['lambda8'] = lambda8;

    lambda_list.y['lambda1'] = lambda11;
    lambda_list.y['lambda2'] = lambda11;
    lambda_list.y['lambda3'] = lambda11;
    lambda_list.y['lambda4'] = lambda11;

    return lambda_list
  }

  // 板要素の耐荷性の照査
  private calcBtoDto(steels, param_sec, param_val, shapeName) {
    const result = {};

    const tension = steels.tension;
    const compress = steels.compress;
    const shear1 = steels.shear1;
    const shear2 = steels.shear2;

    // 作用応答値の集計
    const sigma_N = param_val.Nd * 1000 / param_sec.A;
    const sigma_N1 = (param_val.Nd > 0) ? 0 : sigma_N;
    const sigma_My1 = 0;
    const sigma_My2 = 0;
    const sigma_My3 = 0;
    const sigma_My4 = 0;
    const sigma_Mz1 = param_val.Mzd * 1000 * 1000 / param_sec.Zzu;
    const sigma_Mz2 = param_val.Mzd * 1000 * 1000 / param_sec.Zzuw;
    const sigma_Mz3 = param_val.Mzd * 1000 * 1000 / param_sec.Zzlw;
    const sigma_Mz4 = param_val.Mzd * 1000 * 1000 / param_sec.Zzl;
    const sigmasigma1 = sigma_N1 + sigma_My1 + sigma_Mz1;
    const sigmasigma2 = sigma_N1 + sigma_My2 + sigma_Mz1;
    const sigmasigma3 = sigma_N1 + sigma_My1 + sigma_Mz4;
    const sigmasigma4 = sigma_N1 + sigma_My2 + sigma_Mz4;
    const sigmasigmas = [ [sigmasigma1, sigmasigma2], [sigmasigma3, sigmasigma4] ];

    // 上フランジ（圧縮側）
    const bto_com = this.calcBto_flange(compress, shear1, [sigmasigma1, sigmasigma2], shapeName);
    for (const key of Object.keys(bto_com)) {
      result[key + '_compress'] = bto_com[key];
    }
    let chi: any;
    let chi_bto: any;
    if( result['bt_compress'] < result['bto_compress'] ) {
      chi = '---';
      chi_bto = '---';
    } else {
      if (compress.lib_n <= 0) {
        chi = 1.2;
        chi_bto = chi * result['bto_compress'];
      } else {
        chi = 1.7;
        chi_bto = chi * result['bto_compress'];
      }
    }
    result['chi_compress'] = chi;
    result['chi_bto_compress'] = chi_bto;

    // 下フランジ（引張側）
    const bto_ten = this.calcBto_flange(tension, shear1, [sigmasigma3, sigmasigma4], shapeName);
    for (const key of Object.keys(bto_ten)) {
      result[key + '_tension'] = bto_ten[key];
    }
    if( result['bt_tension'] < result['bto_tension'] ) {
      chi = '---';
      chi_bto = '---';
    } else {
      if (tension.lib_n <= 0) {
        chi = 1.2
        chi_bto = chi * result['bto_tension'];
      } else {
        chi = 1.7
        chi_bto = chi * result['bto_tension'];
      }
    }
    result['chi_tension'] = chi;
    result['chi_bto_tension'] = chi_bto;

    // 腹板（せん断）
    const d: number = tension['steel_h'] + shear1['steel_h'] + compress['steel_h']; 
    const sigma_d: number = Math.abs(sigma_N) + Math.abs(sigma_My3) + Math.abs(sigma_Mz3);
    const tau_d: number = 0 / (shear1['steel_h'] * shear1['steel_b'])
    const Dto = this.calcDto(d, shear1, shear2, 400, {sigma_d, tau_d});
    for (const key of Object.keys(Dto)) {
      result[key + '_shear'] = Dto[key];
    }

    // 局部座屈に対する係数の算出
    const rho_bl_compress = result['rho_bl_both_compress'];
    const rho_bl_tension = result['rho_bl_both_tension'];
    const key_min: string = ( rho_bl_compress === Math.min(rho_bl_tension, rho_bl_compress) )
                          ? '_compress'
                          : '_tension';
    const rho_bl0: number = result['rho_bl_both' + key_min];
    const eta0: number = result['eta_both' + key_min];
    const ko0: number = result['ko_both' + key_min];
    const Rr0: number = result['Rr_both' + key_min];
    result['rho_bl0'] = rho_bl0;
    result['eta0'] = eta0;
    result['ko0'] = ko0;
    result['Rr0'] = Rr0;


    return result;
  }

  private calcBto_flange(element, shear, sigmasigmas, shapeName): any {

    const result = {};

    const sigma1 = (Math.abs(sigmasigmas[0]) > Math.abs(sigmasigmas[1])) ? sigmasigmas[0] : sigmasigmas[1];
    const sigma2 = (sigma1 === sigmasigmas[0]) ? sigmasigmas[1] : sigmasigmas[0];
    const psi = sigma2 / sigma1;

    // elementはtensionまたはcompress
    if (shapeName === 'I' || shapeName === 'Box' || shapeName === 'PI') {
      // まずは片縁支持板のb/tを計算する
      const bt = ( element.steel_w - shear.steel_b / 2 ) / element.steel_h;
      result['bt'] = bt;
      const single = this.calcBtoParam_flange(element, shear, {sigma1, sigma2, psi}, 'single');
      for (const key of Object.keys(single)) {
        result[key] = single[key];
      }
      // if文でbox型なら、両縁支持板の情報を追加する
      if (shapeName === 'Box' || shapeName === 'PI') {
        const bt_both = ( shear.steel_w - shear.steel_b / 2 - shear.steel_b / 2 ) / element.steel_h;
        result['bt_both'] = bt_both;
        const both = this.calcBtoParam_flange(element, shear, {sigma1, sigma2, psi}, 'both');
        for (const key of Object.keys(both)) {
          result[key + '_both'] = both[key];
        }
      }
    }

    return result;
  }

  private calcBtoParam_flange (element, shear, param, key) {

    const result = {};
    const flag: boolean = (key === 'both') ? true : false;

    const E: number = 2.0 * 10**5;
    const nu: number = 0.3; 

    const n = element.lib_n + 1;

    const psi = param.psi;
    result['psi'] = psi;

    const sigma1 = param.sigma1;
    const sigma2 = param.sigma2;

    let Rcr: number;
    if (flag) {
      if (n <= 1) {
        Rcr = 0.85 - 0.15 * psi;
      } else {
        Rcr = 0.75 - 0.25*(n - 1 + psi) / n;
      }
    } else {
      // 片縁支持板のRcrは未確認
      Rcr = 0.85 - 0.15 * psi;
    }
    result['Rcr'] = Rcr;

    let k: number;
    if (flag) {
      if (n <= 1) {        
        if ( -1.0 <= psi && psi < 0 ) {
          k = 10*psi**2 - 6.27*psi + 7.63;
        } else {
          k = 8.4 / (psi + 1.1);
        }
      } else {
        k = 8.4*(n ** 3) / (2.1 * n - 1 + psi);
      }
    } else {
      // 片縁支持板のkは未確認
      if ( -1.0 <= psi && psi < 0 ) {
          k = 10*psi**2 - 6.27*psi + 7.63;
       } else {
          k = 8.4 / (psi + 1.1);
      }
    }
    result['k'] = k;

    let eta: number;
    if (flag) {
      if (n <= 1) {
        eta = (0.85 - 0.15*psi) * k**0.5 / 1.4;
      } else {
        eta = ( 0.5 + 0.25*(1 - psi) / n ) * k ** 0.5 / n;
      }
    } else {
      // 片縁支持板のetaは未確認
      eta = (0.85 - 0.15*psi) * k**0.5 / 1.4;
    }
    result['eta'] = eta;

    const ko = 4.0;
    result['ko'] = ko;

    const Rr = 1 / eta * shear.steel_w / element.steel_h * ( (12*(1-nu**2)) / (Math.PI**2*ko) * element.fsy.fsyk / E )**0.5;
    result['Rr'] = Rr;

    let rho_bl: number;
    if (flag) {
      if (n <= 1) {
        rho_bl = 0.49 / Math.max(0.7, Rr)**2;
      } else {
        if (0.5 < Rr && Rr <= 1.0) {
          rho_bl = 1.5 - Math.max(0.5, Rr);
        } else {
          rho_bl = 0.5 / Rr**2;
        }
      }
    } else {
      // 片縁支持板のrho_blは未確認
      rho_bl = 0.49 / Math.max(0.7, Rr)**2;
    }
    result['rho_bl'] = rho_bl;

    let bto = 16;
    if (flag) {
      if ( n <= 1 && sigma1 > 0 && sigma2 > 0 ) {
        bto = 60;
      } else if (sigma1 > 0 && sigma2 > 0) {
        bto = 60 * n;
      } else {
        bto = Rcr * ( (Math.PI**2 * k) / (12*(1-nu**2)) * E / element.fsy.fsyk )**0.5;
      }
    }
    result['bto'] = bto;

    return result;

  }

  private calcDto (d, shear1, shear2, num, sigma_list) {
    const result = {};

    const Dw: number = shear1.steel_h;
    const tw: number = shear1.steel_b;
    const Dt: number = Dw / tw;
    result['dt'] = Dt;

    let Dto: number;
    const element_no = num; // SM400;
    // 水平補剛版があるときはtrue, 無ければfalse
    if (false) {
      if (element_no === 570) {
        Dto = 225;
      } else {
        Dto = 250;
      }
    } else {
      if (element_no === 400) {
        if (0 <= tw && tw <= 16) {
          Dto = 132.8;
        } else if (16 < tw && tw <= 40) {
          Dto = 135.6;
        } else {
          Dto = 141.8;
        }
      } else if (element_no === 490) {
        if (0 <= tw && tw <= 16) {
          Dto = 115.3;
        } else if (16 < tw && tw <= 40) {
          Dto = 117.1;
        } else {
          Dto = 121.0;
        }
      } else if (element_no === 520) {
        if (0 <= tw && tw <= 16) {
          Dto = 108.8;
        } else if (16 < tw && tw <= 40) {
          Dto = 110.3;
        } else {
          Dto = 113.6;
        }
      } else {
        if (0 <= tw && tw <= 16) {
          Dto = 96.9;
        } else if (16 < tw && tw <= 40) {
          Dto = 98.0;
        } else {
          Dto = 100.2;
        }
      }
    }
    result['dto'] = Dto;
    const dDw: number = d / Dw;
    
    let Ax40;
    if (false && dDw < 0.8) {
      Ax40 = 0.8;
    } else if (dDw < 1) {
      Ax40 = 1
    } else {
      Ax40 = 2
    }
    let Ax41;
    if (false && dDw > 0.8) {
      Ax41 = 0.8;
    } else if (false && dDw <= 0.8) {
      Ax41 = '-';
    } else if (dDw > 1) {
      Ax41 = 1;
    } else {
      Ax41 = '-';
    }
    const AB44: number = (false) ? 2036 : 377;
    let AM44: number;
    let AT44: number;
    if (false) {
      if (dDw <= 0.8) {
        AM44 = 98.6;
        AT44 = 84.3;
      } else {
        AM44 = 132.0;
        AT44 = 63.1;
      }
    } else {
      if (dDw <= 1) {
        AM44 = 63.1;
        AT44 = 84.3;
      } else {
        AM44 = 84.3;
        AT44 = 63.1;
      }
    }

    const ratio: number = ( ( Dw / ( 100 * tw ) )**4)
                        * ( ( sigma_list.sigma_d / AB44 )**2
                        + ( sigma_list.tau_d / (AM44 + AT44 * ((1 / dDw) ** 2)))**2);


    return result;
  }

}
