import { SaveDataService } from '../../providers/save-data.service';
import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
// import { CalcSafetyShearForceService } from '../result-safety-shear-force/calc-safety-shear-force.service';

import { Injectable, ViewChild } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputFatiguesService } from 'src/app/components/fatigues/fatigues.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
// import { CalcSafetyFatigueMomentService } from '../result-safety-fatigue-moment/calc-safety-fatigue-moment.service';
import { InputCrackSettingsService } from 'src/app/components/crack/crack-settings.service';
import { CalcVmuService } from '../result-calc-page/calc-vmu.service';

@Injectable({
  providedIn: 'root'
})

export class CalcSafetyFatigueShearForceService {

  // 安全性（疲労破壊）せん断力
  public DesignForceList: any[];  // 永久+変動作用
  public DesignForceList1: any[]; // 疲労限
  public DesignForceList2: any[]; // 変動応力
  public DesignForceList3: any[]; // 永久作用
  public isEnable: boolean;
  public safetyID: number = 1;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private crack: InputCrackSettingsService,
    // private moment: CalcSafetyFatigueMomentService,
    // private base: CalcSafetyShearForceService,
    private vmu: CalcVmuService,
    private fatigue: InputFatiguesService,
    private post: SetPostDataService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService) {
    this.DesignForceList = null;
    this.DesignForceList1 = null;
    this.DesignForceList2 = null;
    this.DesignForceList3 = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void {

    this.isEnable = false;

    this.DesignForceList = new Array();

    // // せん断力が計算対象でない場合は処理を抜ける
    // if (this.calc.print_selected.calculate_shear_force === false) {
    //   return;
    // }

    // 列車本数の入力がない場合は処理を抜ける
    if (this.helper.toNumber(this.fatigue.train_A_count) === null &&
      this.helper.toNumber(this.fatigue.train_B_count) === null) {
      return;
    }

    // 疲労限
    const No2 = (this.save.isManual()) ? 2 : this.basic.pickup_torsional_moment_no(2);
    this.DesignForceList1 = this.force.getDesignForceList(
      'Vd', No2);
    // 最小応力
    const No3 = (this.save.isManual()) ? 3 : this.basic.pickup_torsional_moment_no(3);
    this.DesignForceList3 = this.force.getDesignForceList(
      'Vd', No3, false);
    // 最大応力
    const No4 = (this.save.isManual()) ? 4 : this.basic.pickup_torsional_moment_no(4);
    this.DesignForceList = this.force.getDesignForceList(
      'Vd', No4);

    // 変動応力
    this.DesignForceList2 = this.force.getLiveload(this.DesignForceList3, this.DesignForceList);

  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Vd', this.safetyID, this.DesignForceList, this.DesignForceList2, this.DesignForceList3, this.DesignForceList1);

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(force1[0], force1[1], force1[2], force1[3]);

    // 有効な入力行以外は削除する
    this.deleteFatigueDisablePosition(force2);

    
    // POST 用 -> 疲労限
    const option = {};
    const postData2 = this.post.setInputData( 'Vd', '応力度', this.safetyID, option, 
    force2[2], force2[1], force2[3]);

    // POST 用 -> 疲労破壊
    const postData = [];
    for(const a of [force2[1], force2[2]]){
      for(const b of a){
        for(const c of b.designForce){
          postData.push({
            index: b.index,
            side: c.side,
            Nd: c.Nd,
            Md: c.Md,
            Vd: c.Vd,
            Reactions: [{
              M: { Mi: 0 } // Vcd の算定で用いるβn=1とするため 0でよい
            }]
          });
        }
      }
    }
    return postData2;
  }

  // 疲労破壊の照査の対象外の着目点を削除する
  private deleteFatigueDisablePosition(force: any) {

    for (let ip = force[0].length - 1; ip >= 0; ip--) {
      const pos: any = force[0][ip];

      const force0 = pos.designForce;

      // 疲労に用いる係数を取得する
      const info = this.fatigue.getCalcData(pos.index);
      for (let i = force0.length - 1; i >= 0; i--) {
        // 係数に１つも有効な数値がなければ削除
        let enable = false;
        for(const k of Object.keys(info.share)){
          if(info.share[k] !== null){
            enable = true;
            break;
          }
        }
        if((enable === false) ||(force0[i].Vd === 0)) {
          for(const f of force){
            f[ip].designForce.splice(i, 1);
          }
        } else {
          force0['fatigue'] = info.share;
        }
      }

      if (pos.designForce.length < 1) {
        for(const f of force){
          f.splice(ip, 1);
        }
      }
    }
  }

  //
  public getSafetyFactor(g_id: any) {
    return this.safety.getCalcData('Vd', g_id, this.safetyID);
  }

  public calcFatigue( res: any, section: any, fc: any, safety: any, tmpFatigue: any, option: any = {} ): any {

    // 運輸機構モードの場合 k=0.12を固定とする
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1==0 && speci2===1){
      option['k12'] = true; 
    }

    const resMin: any = res[0];
    const resMax: any = res[1];
    const resGen: any = res[2];

    // 疲労の Vcd を計算する時は βn=1
    const DesignForceList = { Md: resMin.Md, Vd: resMin.Vd, Nd: 0};
    const result: any = this.vmu.calcVmu(res[0], section, fc, safety, null, DesignForceList);

    // 最小応力
    let Vpd: number = this.helper.toNumber(resMin.Vd);
    if (Vpd === null) { return result; }
    Vpd = Math.abs(Vpd);
    result.Vpd = Vpd;

    let Mpd: number = this.helper.toNumber(resMin.Md);
    if (Mpd !== null) {
      Mpd = Math.abs(Mpd);
      result['Mpd'] = Mpd;
    }

    const Npd: number = this.helper.toNumber(resMin.Nd);
    if (Npd !== null) {
      result['Npd'] = Npd;
    }

    // 変動応力
    let Vrd: number = this.helper.toNumber(resMax.Vd);
    if (Vrd === null) { return result; }
    Vrd = Math.abs(Vrd);
    result['Vrd'] = Vrd;

    let Mrd: number = this.helper.toNumber(resMax.Md);
    if (Mrd !== null) {
      Mrd = Math.abs(Mrd);
      result['Mrd'] = Mrd;
    }

    const Nrd: number = this.helper.toNumber(resMax.Nd);
    if (Nrd !== null) {
      result['Nrd'] = Nrd;
    }

    // 部材の整理 I型のみの対応
    let tension: any;
    let compress: any;
    let shear: any;
    if (resGen.side.includes('下側')) {
      tension = section.steels['3'];
      compress = section.steels['1'];
      shear   = section.steels['2'];
    } else {
      tension = section.steels['1'];
      compress = section.steels['3'];
      shear   = section.steels['2'];
    }
    // 疲労減の計算
    const A = section.steels.A;
    const Ix = section.steels.Ix;
    const Iy = section.steels.Iy;
    const dim = section.steels.dim;

    // (3)疲労減による照査
    // 1) 作用応力範囲
    const sigma_max: number = resGen.Md * 10**6 / Ix * (dim.yt - tension.steel_h);
    const sigma_min: number = resMin.Md * 10**6 / Ix * (dim.yt - tension.steel_h);
    const tau_max: number = resGen.Vd * 10**3 / dim.Aw;
    const tau_min: number = resMin.Vd * 10**3 / dim.Aw;
    result['sigma_max'] = sigma_max;
    result['sigma_min'] = sigma_min;
    result['tau_max'] = tau_max;
    result['tau_min'] = tau_min;

    // 2) 合成応力に対する照査
    const sigma_Pmax: number = 1/2 * (sigma_max + ( sigma_max**2 + 4*tau_max**2 )**0.5 );
    const sigma_Pmin: number = 1/2 * (sigma_min + ( sigma_min**2 + 4*tau_min**2 )**0.5 );
    result['sigma_Pmax'] = sigma_Pmax;
    result['sigma_Pmin'] = sigma_Pmin;
    const gamma_a: number = 1.0;
    result['gamma_a'] = gamma_a;
    const delta_sigma_fud: number = gamma_a * (sigma_Pmax - sigma_Pmin);
    result['delta_sigma_fud'] = delta_sigma_fud;

    // 3)疲労強度
    let delta_sigma_cod: number = 115.0;
    const delta_sigma_cod_list = {
      'A': 190, 'B': 155, 'C': 115, 'D': 84,
      'E': 62,  'F': 46,  'G': 32,
    }
    delta_sigma_cod = delta_sigma_cod_list[tmpFatigue.bottom.Class];
    // const fai = sigma_min / (sigma_max - sigma_min);
    const fai = sigma_Pmin / (sigma_Pmax - sigma_Pmin);
    let CR: number = 1.00;
    if (fai > -0.5) {
      CR = 1.00;
    }
    let CT: number = 1.00;
    if (tension.steel_h <= 25) {
      CT = 1.00;
    }
    const delta_sigma_cod2 = delta_sigma_cod * CR * CT;
    result['delta_sigma_cod'] = delta_sigma_cod;
    result['fai'] = fai;
    result['CR'] = CR;
    result['CT'] = CT;
    result['delta_sigma_cod2'] = delta_sigma_cod2;

    // 4) 疲労減による照査
    const gamma_i: number = 1.0;
    const ratio: number = gamma_i * delta_sigma_fud / delta_sigma_cod2;
    result['gamma_i'] = gamma_i;
    result['ratio'] = ratio;
    


    /*// f200 の計算
    let rs = this.helper.toNumber(safety.safety_factor.rs);
    if (rs === null) { rs = 1.05; }
    result['rs'] = rs;

    let k = 0.12;


    let reference_count: number = this.helper.toNumber(this.fatigue.reference_count);
    if (reference_count === null) {
      reference_count = 2000000;
    }


    const ri: number = safety.safety_factor.ri;
    result['ri'] = ri;

    let rb = this.helper.toNumber(safety.safety_factor.rbs);
    if (rb === null) { rb = 1; }


    // 標準列車荷重観山の総等価繰返し回数 N の計算
    let T: number = this.helper.toNumber(this.fatigue.service_life);
    if (T === null) { return result; }

    const j = this.getTrainCount();
    const jA = j[0];
    const jB = j[1];*/


    return result;

  }

  private bend( section, result, inputFatigue, reference_count, rb, fai){
    
    const Vpd = result.Vpd;
    const Vrd = result.Vrd;
    const kr = result.kr;
    const rs = result.rs;
    const ri = result.ri;
    
    // 折り曲げ鉄筋の永久応力度
    const SumCosSin = Math.cos(Math.PI * result.deg2 / 180) + Math.sin(Math.PI * result.deg2 / 180);
    const tmpWrd1: number = Vpd + Vrd - kr * result.Vcd;
    const tmpWrd2 = (result.Aw * result.z) / (result.Ss * SumCosSin**2)
                  + (result.Asb * result.z * SumCosSin) / result.Ss2;
    const tmpWrd3: number = Vpd + result.Vcd;
    const tmpWrd4: number = Vpd + Vrd + result.Vcd;
    let sigma_min2: number = (tmpWrd1 / tmpWrd2) * (tmpWrd3 / tmpWrd4);
    if (sigma_min2 === null) { return result; }
    sigma_min2 = sigma_min2 * 1000;
    result['sigma_min2'] = sigma_min2;
    const _sigma_min2 = Math.max(sigma_min2, 0);

    // 折り曲げ鉄筋の変動応力度
    let sigma_rd2: number = (tmpWrd1 / tmpWrd2) * (Vrd / tmpWrd4);
    if (sigma_rd2 === null) { return result; }
    sigma_rd2 = sigma_rd2 * 1000;
    result['sigma_rd2'] = sigma_rd2;
    const _sigma_rd2 = Math.max(sigma_rd2, 0);
    
    // 折り曲げ鉄筋のf200 の計算
    let k2 = 0.12;

    const fai2: number = this.helper.toNumber(section.Asb.bending_dia);
    if (fai2 === null) { return result; }

    const fwud2: number = this.helper.toNumber(section.Asb.fwud);
    if (fwud2 === null) { return result; }
    result['fwud2'] = fwud2;

    let r12: number = this.helper.toNumber(inputFatigue.r1_3);
    if (r12 === null) { r12 = 1.00; }
    result['r12'] = r12;

    let ar2: number = 3.09 - 0.003 * fai2;

    const tmp203: number = Math.pow(10, ar2) / Math.pow(reference_count, k2);
    const tmp204: number = 1 - _sigma_min2 / fwud2;
    const fsr2002: number = r12 * tmp203 * tmp204 / rs;
    result['fsr2002'] = fsr2002;

    const ratio2002: number = ri * _sigma_rd2 / (fsr2002 / rb);
    result['ratio2002'] = ratio2002;

    if (ratio2002 < 1) {
      k2 = 0.06;
      ar2 = 2.71 - 0.003 * fai;
    } else {
      k2 = 0.12;
      ar2 = 3.09 - 0.003 * fai;
    }
    result['k2']  = k2;
    result['ar2']  = ar2;

    // frd2（折り曲げ鉄筋） の計算
    const a = result.a;
    const b = result.b;
    const N = result.N;
    const r2 = result.r2;
    const ratio200 = result.ratio200;

    if (section.Asb.Asb !== null){
      const tmpR21_b: number = Math.pow(a, 1 / k2);
      const tmpR22_b: number = Math.pow(1 - a, 1 / k2);
      const tmpR23_b: number = (tmpR21_b + tmpR22_b) * ((1 - b) + b);
      const r2_b: number = Math.pow(1 / tmpR23_b, k2);
      result['r2'] = r2;

      const tmpfrd1_b: number = Math.pow(10, ar2) / Math.pow(N, k2);
      const tmpfrd2_b: number = 1 - _sigma_min2 / fwud2;
      const frd2: number = r12 * r2_b * tmpfrd1_b * tmpfrd2_b / rs;
      result['frd2'] = frd2;

      if (ratio200 < 1 && N <= reference_count) {
        return result;
      }

      const ratio2: number = ri * _sigma_rd2 / (frd2 / rb);
      if(ratio2 > 0){
        result['ratio2'] = ratio2;
      }
    }
  }

  // 列車本数を返す関数
  public getTrainCount(): number[] {
    const result = new Array(2);
    let jA = 0;
    if ('train_A_count' in this.fatigue) {
      jA = this.helper.toNumber(this.fatigue.train_A_count);
      if (jA === null) { jA = 0; }
    }
    let jB = 0;
    if ('train_B_count' in this.fatigue) {
      jB = this.helper.toNumber(this.fatigue.train_B_count);
      if (jB === null) { jB = 0; }
    }
    result[0] = jA;
    result[1] = jB;
    return result;
  }

}
