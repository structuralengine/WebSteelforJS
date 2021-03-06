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
    result['Nd'] = Nd;// Math.abs(Nd);

    let Md: number = this.helper.toNumber(force.Md);
    if (Md === null) {
      Md = 0;
    }
    // Md = Math.abs(Md);
    const Mxd = Md;
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
    let buckle_c: boolean;
    let buckle_s: boolean = crackInfo.buckle_s;
    let buckle_t: boolean;
    if (force.side.includes('下側')) {
      buckle_c = crackInfo.buckle_u;
      buckle_t = crackInfo.buckle_l;
    } else {
      buckle_c = crackInfo.buckle_l;
      buckle_t = crackInfo.buckle_u;
    }

    // 座屈長の計算
    const lambda_list = this.calcEffectiveWidth(sectionM, compress, tension, shear1, shear2, crackInfo)

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

    // 中立軸からの距離と断面係数の整理
    const yc = (force.side.includes('下側')) 
             ? centroid.y 
             : tension['steel_h'] + shear1['steel_h'] + compress['steel_h'] + centroid.y;
    const Zzc = param['Ix'] / yc;
    const ycw = (force.side.includes('下側')) 
              ? compress['steel_h'] + centroid.y
              : tension['steel_h'] + shear1['steel_h'] + centroid.y;
    const Zzcw = param['Ix'] / ycw;
    const ytw = (force.side.includes('下側')) 
              ? tension['steel_h'] + shear1['steel_h'] + centroid.y
              : compress['steel_h'] + centroid.y;
    const Zztw = param['Ix'] / ytw;
    const yt = (force.side.includes('下側')) 
             ? tension['steel_h'] + shear1['steel_h'] + compress['steel_h'] + centroid.y
             : centroid.y;
    const Zzt = param['Ix'] / yt;
    const param_sec = {A, yu: yc, Zzu: Zzc, yuw: ycw, Zzuw: Zzcw, ylw: ytw, Zzlw: Zztw, yl: yt, Zzl: Zzt};


    // 5.4.1 板要素の耐荷性の照査
    const param_val = {Nd, Myd: 0, Mzd: Md};
    const sigma_N = (Nd > 0) ? 0: Nd * 1000 / A;
    const sigma_My1 = 0;
    const sigma_My2 = 0;
    const sigma_Mz1 = Md * 1000 * 1000 / Zzc;
    const sigma_Mz2 = Md * 1000 * 1000 / Zzt;
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
                                      {buckle_c, buckle_s, buckle_t},
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


    // 設計曲げ耐力（z軸(x軸)まわり）
    const alpha: number = tf / shear1.steel_b;
    const b: number = (tension.steel_b + compress.steel_b) / 2;
    const beta: number = shear1.steel_h / b;
    const bl = b / Lz;
    let rho_bg_culc: number;
    if (Lz <= 0 || Lz == undefined) {
      // 有効座屈長を考慮しないとき
      rho_bg_culc = 1.0;
    } else {
      // 有効座屈量を考慮する
      let F: number;  // Fの値は形状で分岐する
      if (sectionM.shapeName === 'I') {
        F = ( 12 + (2 * beta / alpha) ) ** 0.5;
      } else if (sectionM.shapeName === 'Box') {
        const betao: number = (14 + 12 * alpha) / (5 + 21 * alpha);
        if (beta < betao) {
          F = 0;
        } else if (betao <= beta && beta < 1) {
          F = (1.05*(beta-betao)/(1-betao))*(3*alpha+1) ** 0.5 * (b / Lz) ** 0.5;
        } else if (1 <= beta && beta < 2) {
          F = 0.74*((3*alpha+beta)*(beta+1)) ** 0.5 * (b / Lz) ** 0.5
        } else {
          F = 1.28 * (3*alpha+beta) ** 0.5 * (b / Lz) * 0.5
        }
      } else {
        // 要分岐追加 -> 一旦I型の式を入れておく
        F = ( 12 + (2 * beta / alpha) ) ** 0.5;
      }
      // 等価細長比 lambda_e
      const lambda_e: number = 1 / Math.PI * (compress.fsy.fsyk / E)**0.5 * (F * (Lz / b));
      result['lambda_e'] = lambda_e;
      if (lambda_e <= 0.1) {
        rho_bg_culc = 1.0;
      } else if (0.1 < lambda_e && lambda_e <= 2 ** 0.5) {
        rho_bg_culc = 1.0 - 0.53*(lambda_e - 0.1);
      } else {
        rho_bg_culc = 1.7 / (2.8 * lambda_e ** 2);
      }
    }
    // rho_bl_culcは4(または8)ケースの最小の値を採用する
    let rho_bl_culc: number = 1.0;
    for (const key1 of ['_compress', '_tension']) {
      for (const key2 of ['', '_both']) {
        const key: string = key2 + key1;

        const bt: number = bto_list['bt' + key];
        // 存在しなければスキップ
        if (bt === undefined) {
          break;
        }

        const E: number = 2.0 * 10**5;
        const nu: number = 0.3;
        const element = (key1 === '_compress') ? compress : tension;
        const n: number = element.lib_n;
        const ko: number = bto_list['ko' + key];
        const fsyk = element.fsy.fsyk;
        const Rcr = (n === 0) ? 0.7 : 0.5;

        // btoを計算（圧縮力限定）
        const bto: number = Rcr * ( (Math.PI**2 * ko) / (12*(1 - nu**2)) * E / fsyk )**0.5;

        const chi: number = (n === 0) ? 1.2 : 1.7;
        const chi_bto = chi * bto;
        const Rr = bt * ( ((12*(1 - nu ** 2)) / (Math.PI ** 2 * ko)) * (fsyk / E) ) ** 0.5;

        let rho_bl: number;
        if (bt <= bto) {
          rho_bl = 1.0;
        } else if (bt < chi_bto) {
          if (n <= 0) {
            // 両縁支持板のとき
            rho_bl = 0.49 / Math.min(0.7, Rr);
          } else {
            // 補剛版のとき
            if (Rr <= 0.5) {
              rho_bl = 1.5 - 0.5;
            } else if (0.5 < Rr && Rr <= 1.0) {
              rho_bl = 1.5 - Rr;
            } else {
              rho_bl = 0.5 / Rr**2;
            }
          }
        }

        // ρblの最小値の更新
        if (rho_bl_culc > rho_bl) {
          rho_bl_culc = rho_bl;
        }
      }
    }
    // 設計曲げ圧縮耐力（z軸(x軸)まわり）
    // 中立軸から圧縮側フランジ外側までの距離yco, 圧縮側フランジ内側までの距離yci
    const yco: number = (force.side.includes('下側')) ? dim['yuo'] : dim['ylo'];
    const yci: number = (force.side.includes('下側')) ? dim['yui'] : dim['yli'];
    const fsyk_compress = compress['fsy']['fsyk'];
    const fsyd_compress: number = fsyk_compress / rs;
    result['fsyk_compress'] = fsyk_compress;
    const Afg_compress = Lz_b * compress['steel_h'];  // フランジの断面積
    const Afn_compress = Lz_b * compress['steel_h'];  // フランジの有効断面積
    const Mucd = Math.min(rho_bg_culc, rho_bl_culc)
                * ( param['Ix'] / yco )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000; 
    result['Mucd'] = Mucd;
    const Mucod = 1.0
                * ( param['Ix'] / yco )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000; 
    result['Mucod'] = Mucod;
    result['rho_bg_culc'] = rho_bg_culc;
    result['rho_bl_culc'] = rho_bl_culc;

    // const fsyk_compress = compress['fsy']['fsyk'];
    // const fsyd_compress: number = fsyk_compress / rs;
    // result['fsyk_compress'] = fsyk_compress;
    ////////// AfnとAfgが区別できていない //////////
    // 圧縮外側Mucd1と圧縮内側Mucd2
    const Mucd1 = Math.min(rho_bg_culc, rho_bl_culc)
                * ( param['Ix'] / yco )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000;
    const Mucd2 = Math.min(rho_bg_culc, rho_bl_culc)
                * ( param['Ix'] / yci )
                * fsyd_compress
                * ( Afn_compress / Afg_compress )
                / rb_C / 1000 / 1000;
    result['Mucxd'] = Mucd1;
    result['Mucyd'] = 0;

    // 設計曲げ引張耐力（z軸(x軸)まわり）
    // (2) 引張側
    // 中立軸から圧縮側フランジ外側までの距離yco, 圧縮側フランジ内側までの距離yci
    const yto: number = (force.side.includes('下側')) ? dim['ylo'] : dim['yco'];
    const yti: number = (force.side.includes('下側')) ? dim['yli'] : dim['yci'];
    const fsyk_tension = tension['fsy']['fsyk'];
    const fsyd_tension: number = fsyk_tension / rs;
    result['fsyk_tension'] = fsyk_tension;
    const Afg_tension = Lz_b * tension['steel_h'];
    const Afn_tension = Lz_b * tension['steel_h'];
    // 引張外側Mutd1と引張内側Mutd2
    const Mutd1: number = ( param['Ix'] / yto )
                        * fsyd_tension 
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000;
    const Mutd2: number = ( param['Ix'] / yti )
                        * fsyd_tension
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000;
    /* const Mutod: number = ( param['Ix'] / dim['yt'] )
                        * fsyd_tension 
                        * ( Afn_tension / Afg_tension )
                        / rb_T / 1000 / 1000; */
    result['Mutxd'] = Mutd1;
    result['Mutyd'] = 0;
    // result['Mutod'] = Mutod;

    // 設計曲げ圧縮耐力（腹板／z軸廻り）

    const fsyk_shear: number = shear1['fsy']['fsyk'];
    const fsyd_shear: number = fsyk_shear / rs;
    result['fsyk_shear'] = fsyk_shear;
    const Mucwd: number = ( param['Ix'] / Math.abs(ycw) )
                        * fsyd_shear / rb_C / 1000 / 1000;
    result['Mucwd'] = Mucwd;
    
    // 設計曲げ引張耐力（腹板／z軸廻り）
    const Mutwd: number = ( param['Ix'] / Math.abs(ytw) )
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
  private calcEffectiveWidth(section, compress, tension, shear1, shear2, info) {

    const eff_len: number = this.helper.toNumber(section.member.eff_len);
    const sectionNo = info.section;
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
      // 部材区間によってフランジの有効幅が変化するため分岐
      if (sectionNo === 1 || sectionNo === 5) {
        // 式(6.2.3)を使用する
        lambda1 = this.Equation_6_2_3(compress.steel_w, Lz);
        lambda2 = this.Equation_6_2_3((shear1.steel_w / 2), Lz);
        lambda3 = this.Equation_6_2_3((shear1.steel_w / 2), Lz);
        lambda4 = this.Equation_6_2_3(compress.steel_w, Lz);
        lambda5 = this.Equation_6_2_3(tension.steel_w, Lz);
        lambda6 = this.Equation_6_2_3((shear1.steel_w / 2), Lz);
        lambda7 = this.Equation_6_2_3((shear1.steel_w / 2), Lz);
        lambda8 = this.Equation_6_2_3(tension.steel_w, Lz);

        lambda11 = this.Equation_6_2_3((shear1.steel_h + tf) / 2, Ly);
      } else {
        // 式(6.2.4)を使用する
        lambda1 = this.Equation_6_2_4(compress.steel_w, Lz);
        lambda2 = this.Equation_6_2_4((shear1.steel_w / 2), Lz);
        lambda3 = this.Equation_6_2_4((shear1.steel_w / 2), Lz);
        lambda4 = this.Equation_6_2_4(compress.steel_w, Lz);
        lambda5 = this.Equation_6_2_4(tension.steel_w, Lz);
        lambda6 = this.Equation_6_2_4((shear1.steel_w / 2), Lz);
        lambda7 = this.Equation_6_2_4((shear1.steel_w / 2), Lz);
        lambda8 = this.Equation_6_2_4(tension.steel_w, Lz);

        lambda11 = this.Equation_6_2_4((shear1.steel_h + tf) / 2, Ly);
      }
      const Lz_b = 2 * lambda1 + 2 * lambda2;
      const Ly_b = 2 * lambda11 - tf; 
      // const lambda_list: number[] = [lambda1, lambda2, lambda3];

      // 一旦配置
      // lambda3 = lambda2;
      // lambda4 = lambda1;
      // lambda5 = lambda1;
      // lambda6 = lambda2;
      // lambda7 = lambda2;
      // lambda8 = lambda1;
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

  private Equation_6_2_3(b: number, l: number): number {
    let lambda: number;
    const bl = b / l;
    if (bl <= 0.05) {
      lambda = b;
    } else {
      lambda = (1.1 - 2.0 * (b / l)) * b;
    }
    if (lambda >= 0.15 * l) {
      lambda = 0.15 * l;
    }
    return lambda;
  }

  private Equation_6_2_4(b: number, l: number): number {
    let lambda: number;
    const bl = b / l;
    if (bl <= 0.02) {
      lambda = b;
    } else {
      lambda = (1.06 - 3.2 * bl + 4.5 * bl ** 2) * b;
    }
    if (lambda >= 0.15 * l) {
      lambda = 0.15 * l;
    }
    return lambda;
  }

  // 板要素の耐荷性の照査
  private calcBtoDto(steels, buckle, param_sec, param_val, shapeName) {
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
    const sigmas1 = {
      sigma_N: sigma_N1,
      sigma_My1: sigma_My1,
      sigma_My2: sigma_My2,
      sigma_Mz: sigma_Mz1,
    }
    const sigmas2 = {
      sigma_N: sigma_N1,
      sigma_My1: sigma_My1,
      sigma_My2: sigma_My2,
      sigma_Mz: sigma_Mz4,
    }

    // 上フランジ（圧縮側）
    const bto_com = this.calcBto_flange(compress, shear1, sigmas1, buckle.buckle_c, shapeName);
    for (const key of Object.keys(bto_com)) {
      result[key + '_compress'] = bto_com[key];
    }

    // 下フランジ（引張側）
    const bto_ten = this.calcBto_flange(tension, shear1, sigmas2, buckle.buckle_t, shapeName);
    for (const key of Object.keys(bto_ten)) {
      result[key + '_tension'] = bto_ten[key];
    }

    // 腹板（せん断）
    const d: number = tension['steel_h'] + shear1['steel_h'] + compress['steel_h']; 
    const sigma_d: number = Math.abs(sigma_N) + Math.abs(sigma_My3) + Math.abs(sigma_Mz3);
    const tau_d: number = 0 / (shear1['steel_h'] * shear1['steel_b'])
    const Dto = this.calcDto(d, shear1, shear2, {sigma_d, tau_d}, buckle.buckle_s);
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

    // 縦リブ（圧縮フランジ側）

    // 縦リブ（引張フランジ側）

    return result;
  }

  private calcBto_flange(element, shear, sigmas, buckle, shapeName): any {

    const result = {};

    // elementはtensionまたはcompress
    if (shapeName === 'I' || shapeName === 'Box' || shapeName === 'PI') {
      // まずは片縁支持板のb/tを計算する
      const bt = ( element.steel_w - shear.steel_b / 2 ) / element.steel_h;
      result['bt'] = bt;
      const single = this.calcBtoParam_flange(element, shear, {bt: bt, sigmas, buckle}, 'single');
      for (const key of Object.keys(single)) {
        result[key] = single[key];
      }
      // if文でbox型なら、両縁支持板の情報を追加する
      if (shapeName === 'Box' || shapeName === 'PI') {
        const bt_both = ( shear.steel_w - shear.steel_b / 2 - shear.steel_b / 2 ) / element.steel_h;
        result['bt_both'] = bt_both;
        const both = this.calcBtoParam_flange(element, shear, {bt: bt_both, sigmas, buckle}, 'both');
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

    const bt = param.bt;
    const buckle = param.buckle;

    // sigmaの整理
    const sigmas = param.sigmas;
    const sigma_N: number = sigmas.sigma_N;
    const sigma_My1: number = sigmas.sigma_My1;
    const sigma_My2: number = sigmas.sigma_My2;
    const sigma_Mz: number = sigmas.sigma_Mz;
    const sigmasigma1: number = sigma_N + sigma_My1 + sigma_Mz;
    const sigmasigma2: number = sigma_N + sigma_My2 + sigma_Mz;
    const sigma1 = (Math.abs(sigmasigma1) > Math.abs(sigmasigma2)) ? sigmasigma1 : sigmasigma2;
    const sigma2 = (sigma1 === sigmasigma1) ? sigmasigma2 : sigmasigma1;
    const state = (sigma2 >= 0) ? 'compress' : 'tension';
    let psi = sigma2 / sigma1;
    if (sigma_N < 0) {
      psi = -1;
    }

    // 幅厚比の上限値
    let bto: number;
    // 限界座屈パラメータ
    let Rcr: number;
    // 座屈係数
    let k: number;
    // 局部座屈の影響を考慮する係数
    // let rho_bl: number; // 最大幅厚比を考慮しない場合は1.0
    // 緩和係数
    let chi: any;
    // 最大幅厚比
    let chi_bto: any;

    if (sigma1 > 0 && sigma2 > 0) {
      // 軸引張力を受ける部材のとき
      Rcr = 0;
      k = 0;
      if (!flag) {
        // 片縁支持板のとき
        bto = 16;
      } else {
        if (n <= 1) {
          // 両縁支持板のとき
          bto = 60;
        } else {
          // 補剛版のとき
          bto = 60 * n;
        }
      }
    } else {

      // Rcrの計算
      if (flag) {
        if (n <= 1) {
          // 両縁支持板のとき
          Rcr = 0.85 - 0.15 * psi;
        } else {
          // 補剛版のとき 
          Rcr = 0.75 - 0.25*(n - 1 + psi) / n;
        }
      } else {
        // 片縁支持板のRcrは0.7とする
        Rcr = 0.7; // 0.85 - 0.15 * psi;
      }

      // kを計算
      if (!flag) {
        // 片縁支持板のとき、このケースは未確認
        k = 0.425;
      } else {
        if (n <= 1) {    
          // 両縁支持板のとき、psiの値で分岐    
          if ( -1.0 <= psi && psi < 0 ) {
            k = 10*psi**2 - 6.27*psi + 7.63;
          } else {
            k = 8.4 / (psi + 1.1);
          }
        } else {
          // 補剛板のとき
          k = 8.4*(n ** 3) / (2.1 * n - 1 + psi);
        }
      }

      // btoの計算
      bto = Rcr * ( (Math.PI**2 * k) / (12*(1-nu**2)) * E / element.fsy.fsyk )**0.5;

    }

    if (buckle) {
      // 最大幅厚比の緩和係数の計算
      if (!flag) {
        // 片縁支持板のとき
        chi = 1.2;
      } else {
        if (n <= 1) {
          // 両縁支持板のとき
          chi = 1.2;
        } else {
          // 補剛版のとき
          chi = 1.7;
        }
      }
    } else {
      chi = 0;
    }
    chi_bto = chi * bto;

    result['Rcr'] = Rcr;
    result['k'] = k;
    result['bto'] = bto;
    result['chi'] = chi;
    result['chi_bto'] = chi_bto;

    // 設計軸方向耐力計算時の係数
    let eta: number;
    let ko: number;
    let Rr: number;
    let rho_bl: number;

    // ko, etaの計算
    if (!flag) {
      // 片縁支持板のとき
      // 両縁支持板と補剛板の2式の小さい方を採用
      ko = 0.425;
      const case1 = (0.85 - 0.15*psi) * ko**0.5 / 1.4;
      const case2 = ( 0.5 + 0.25*(1 - psi) / 1 ) * ko**0.5 / 1;
      if (case1 < case2) {
        eta = case1;
      } else {
        eta = case2;
      }
    } else {
      if (n <= 1) {
        // 両縁支持板のとき
        ko = 4.0;
        eta = (0.85 - 0.15*psi) * ko**0.5 / 1.4;
      } else {
        // 補剛板のとき
        ko = 4.0 * n ** 2; 
        eta = ( 0.5 + 0.25*(1 - psi) / n ) * ko ** 0.5 / n;
      }
    }

    // Rrの計算
    Rr = (1 / eta) * /* (shear.steel_w / element.steel_h) */bt * ( (12*(1-nu**2)) / (Math.PI**2 * ko) * element.fsy.fsyk / E )**0.5;

    // rho_blの計算
    if (sigma1 > 0 && sigma2 > 0) {
      rho_bl = 1.0;
    } else {
      if (!flag) {
        // 片縁支持板のとき（軸圧縮力のみの式を採用）
        rho_bl = 0.49 / Math.max(0.7, Rr)**2;
      } else {
        if (n <= 1) {
          // 両縁支持板のとき
          rho_bl = 0.49 / Math.max(0.7, Rr)**2;
        } else {
          // 補剛版のとき
          if (Rr <= 0.5) {
            rho_bl = 1.5 - 0.5;
          } else if (0.5 < Rr && Rr <= 1.0) {
            rho_bl = 1.5 - Rr;
          } else {
            rho_bl = 0.5 / Rr**2;
          }
        }
      }
    }

    result['eta'] = eta;
    result['ko'] = ko;
    result['Rr'] = Rr;
    result['rho_bl'] = rho_bl;

    return result;

  }

  private calcDto (d, shear1, shear2, sigma_list, buckle) {
    const result = {};

    const Dw: number = shear1.steel_h;
    const tw: number = shear1.steel_b;
    const Dt: number = Dw / tw;
    result['dt'] = Dt;

    const E: number = 2.0 * 10**5;
    const nu: number = 0.3;

    // 座屈係数kb
    let kb;
    if (shear1.lib_n <= 0) {
      kb = 23.9;
    } else if (shear1.lib_n === 1){
      kb = 129;
    } else {
      kb = 129; //水平補剛材が2断以上の場合に分岐
    }
    result['kb'] = kb;

    // 限界座屈パラメータ
    const Rcr = 1.0;
    result['Rcr'] = Rcr;

    const fsyk: number = shear1.fsy.fsyk;
    const element_no = shear1.fsy.fsuk; 

    // とりあえず中間補剛材、水平補剛材がないケース
    let Dto: number = Rcr * ( ( (Math.PI**2 * kb) / (12 * (1 - nu**2) ) ) * ( E / fsyk ) )**0.5;
    Dto = (Dto > 250) ? 250 : Dto;
    result['dto'] = Dto;

    // 中間補剛材の配置間隔 dDw
    const dDw: number = d / Dw;

    // 最大幅厚比の緩和係数
    const chi: number = (buckle && shear1.lib_n <= 0) ? 1.2 : 0.0;
    const chi_dto: number = chi * Dto;

    result['chi'] = chi;
    result['chi_dto'] = chi_dto;
    
    // 中間補剛材の照査 -> 要修正
    let Ax40;
    if (shear1.lib_n >= 1 && dDw < 0.8) {
      Ax40 = 0.8;
    } else if (dDw < 1) {
      Ax40 = 1
    } else {
      Ax40 = 2
    }
    let Ax41;
    if (shear1.lib_n >= 1 && dDw > 0.8) {
      Ax41 = 0.8;
    } else if (shear1.lib_n >= 1 && dDw <= 0.8) {
      Ax41 = '-';
    } else if (dDw > 1) {
      Ax41 = 1;
    } else {
      Ax41 = '-';
    }
    const AB44: number = (shear1.lib_n >= 1) ? 2036 : 377;
    let AM44: number;
    let AT44: number;
    if (shear1.lib_n >= 1) {
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
