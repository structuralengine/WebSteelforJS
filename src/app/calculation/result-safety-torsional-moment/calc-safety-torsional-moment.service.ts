import { SaveDataService } from "../../providers/save-data.service";
import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";

import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputSafetyFactorsMaterialStrengthsService } from "src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
import { absoluteFrom } from "@angular/compiler-cli/src/ngtsc/file_system";

@Injectable({
  providedIn: 'root'
})
export class CalcSafetyTorsionalMomentService {
  // 安全性（破壊）せん断力
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
    private vmu: CalcSafetyShearForceService,
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

    // せん断力が計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_torsional_moment === false) {
      return;
    }

    const No5 = (this.save.isManual()) ? 5 : this.basic.pickup_torsional_moment_no(5);
    this.DesignForceList = this.force.getDesignForceList(
      "Mt", No5 );
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable('Mt', this.safetyID, this.DesignForceList);

    // POST 用
    const option = {};

    // 曲げ Mud 用
    const postData1 = this.post.setInputData( "Md", "耐力", this.safetyID, option, force[0] );

    // 曲げ Mud' 用
    const force2 = JSON.parse(
      JSON.stringify({ temp: force[0] })
    ).temp;
    for(const d1 of force2){
      for(const d2 of d1.designForce){
        d2.side = (d2.side === '上側引張') ? '下側引張' : '上側引張'; // 上下逆にする
      }
    }
    const postData2 = this.post.setInputData( "Md", "耐力", this.safetyID, option, force2 );
    for(const d1 of postData2){
      d1.side = (d1.side === '上側引張') ? '下側引張の反対側' : '上側引張の反対側'; // 逆であることを明記する
      d1.memo = "曲げ Mud' 用";
    }

    // せん断 Mu 用
    const postData3 = this.post.setInputData( "Vd", "耐力", this.safetyID, option, force[0] );
    for(const d1 of postData3){
      d1.Nd = 0.0;
      d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
      d1.memo = 'せん断 Mu 用';
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
    force: any
  ){

    // 曲げ Mud' 用
    const res2 = OutputData.find(
      (e) => e.index === res1.index && e.side === (res1.side + 'の反対側')
    );
    
    // せん断 Mu 用
    const res3 = OutputData.find(
      (e) => e.index === (-1 * res1.index) && e.side === res1.side
    );

    let result = {};
    if (!(res3 === undefined || res3.length < 1)) {
      result = this.vmu.calcVmu(res3, sectionV, fc, safetyV, null, force)
    }

    if(!('Mt' in force)){
      return result;
    }
    const Mt = Math.abs(force.Mt)
    result['Mt'] = Mt;

    // 部材係数
    const resultData1 = res1.Reactions[0];
    const resultData2 = res2.Reactions[0];
    const safety_factor = safetyM.safety_factor;

    const rb: number = safety_factor.M_rb;
    result['rb'] = rb;
    const Mud = resultData1.M.Mi;
    result['Mud'] = Mud;
    const Mudd = resultData2.M.Mi;
    result['Mudd'] = Mudd;

    const Vud = result['Vyd'];

    const bw: number = sectionV.shape.B;
    const h: number = sectionV.shape.H;

    // 有効高さ
    let dst = this.helper.toNumber(sectionM.Ast.dst);
    if (dst === null) {
      dst = 0;
    }
    const d: number = h - dst;

    // コンクリート材料
    const fck: number = this.helper.toNumber(fc.fck);
    if (fck === null) {
      return result;
    }
    let rc: number = this.helper.toNumber(fc.rc);
    if (rc === null) {
      rc = 1;
    }
    const fcd = fck / rc;

    const ftk = 0.23 * Math.pow(fck, 2/3);
    const ftd = ftk / rc;
    result['ftd'] = ftd;

    let ri: number = 0;
    ri = this.helper.toNumber(safety_factor.ri);
    if (ri === null) {
      ri = 1;
    }
    result["ri"] = ri;

    
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

    // ① 設計純ねじり耐力
    const sigma_nd = (Nd*1000) / (h * bw); // (N/mm2)
    result['sigma_nd'] = sigma_nd;

    const Bnt = Math.sqrt(1 - (Math.abs(sigma_nd) / ftd));
    result['Bnt'] = Bnt;

    //Kt = b^2・d／{3.1＋1.8／( d／b )}
    const kt = Math.pow(bw, 2) * d / (3.1 + (1.8 / (d / bw))); // mm^3
    const Kt = kt / Math.pow(1000, 3); // m^3
    result['Kt'] = Kt;

    // Ｍtcd	=	βnt・Ｋt・ftd／γb	
    const Mtcud = Bnt * Kt * ftd * 1000 / rb;
    result['Mtcud'] = Mtcud;

    const Mtcud_Ratio: number = ri * Mt / Mtcud;
    result["Mtcud_Ratio"] = Mtcud_Ratio;

    if (Mtcud_Ratio >= 1) {
      result['Result'] = "NG";
      return result;
    }

    // ② 設計曲げモーメントが同時に作用する場合の設計ねじり耐力
  	// Ｍtud1	=	Ｍtcd・{ 0.2＋0.8・(1‐γi・Ｍd／Ｍud)1/2 }
    const Mtud1	=	Mtcud * ( 0.2 + 0.8 * Math.pow( 1 - ri * Md / Mud, 0.5));
    const Mtud1_Ratio: number = ri * Mt / Mtud1;

    // ③ 設計せん断力が同時に作用する場合の設計ねじり耐力
    // Ｍtud2	=	Ｍtcd・( 1‐0.8・γi・Ｖd／Ｖud ) 
    const Mtud2	=	Mtcud * ( 1 - 0.8 * ri * Vd / Vud );
    const Mtud2_Ratio: number = ri * Mt / Mtud2;

    if (Math.max(Mtud1_Ratio, Mtud2_Ratio) < 0.5) {
      // 安全率が 0.5 以下なら 最小ねじり補強筋を配置して検討省略する
      result['Mtud'] = Mtud1;
      result['Mtud_Ratio'] = Mtud1_Ratio;

      result['Mtvd'] = Mtud2;
      result['Mtvd_Ratio'] = Mtud2_Ratio;

      return result; 
    }

    // 2) ねじり補強鉄筋がある場合の設計ねじり耐力

    // ① 設計斜め圧縮破壊耐力
    // fwcd =	1.25・(f'cd)1/2
    const fwcd = 1.25 * Math.pow(fcd, 0.5);
    result['fwcd'] = fwcd;

    // Ｍtcud	=	Ｋt・fwcd／ γb
    const Mtcd =	Kt * (fwcd * 1000) / rb;
    const Mtcd_Ratio: number = ri * Mt / Mtcd;
    result['Mtcd'] = Mtcd;
    result['Mtcd_Ratio'] = Mtcd_Ratio;
    
    // ② 設計ねじり耐力

    /// 引張鉄筋の情報
    const tension = sectionM['Ast']['tension'];
    let dt = 0;
    let Ast_dia = 0;
    let Ast = 0;
    let fsyt = 0;
    if (!(tension === null)) {
      dt = this.helper.toNumber(tension['dsc']);
      if (dt === null) {
        dt = 0;
      } else {
        Ast_dia = this.helper.toNumber(tension['rebar_dia']);
        Ast = this.helper.toNumber(sectionM['Ast']['Ast']);
        fsyt = this.helper.toNumber(sectionM['Ast']['fsd']);
      }
    }

    /// 圧縮鉄筋の情報
    const compress = sectionM['Asc']['compress'];
    let dc = 0;
    let Asc_dia = 0;
    let Asc = 0;
    let fsyc = 0;
    if (!(compress === null)) {
      dc = this.helper.toNumber(compress['dsc']);
      Asc_dia = 0;
      if (dc === null) {
        dc = 0;
      } else {
        Asc_dia = this.helper.toNumber(compress['rebar_dia']);
        Asc = this.helper.toNumber(sectionM['Asc']['Asc']);
        fsyc = this.helper.toNumber(compress['fsy']['fsy'] / compress.rs);
      }
    }

    /// 側面鉄筋の情報
    const sidebar = sectionM['Ase']['sidebar'];
    let de = 0;
    let Ase_dia = 0;
    let Ase = 0;
    let fsye = 0;
    if (!(sidebar === null)) {
      de = this.helper.toNumber(sidebar['cover']);
      if (de === null) {
        de = 0;
      } else {
        Ase_dia = this.helper.toNumber(sidebar['side_dia']);
        Ase = this.helper.toNumber(sectionM['Ase']['Ase']);
        fsye = this.helper.toNumber(sidebar['fsy']['fsy'] / sidebar.rs);
      }
    }

    // スターラップ
    const Aw = sectionV['Aw'];
    let stirrup_dia = 0;
    let Atw = 0;
    let Ss = Number.MAX_VALUE;
    let fwyd = 0;
    if (!(Aw === null)) {
      stirrup_dia = this.helper.toNumber(Aw['stirrup_dia']);
      if (stirrup_dia === null) {
        stirrup_dia = 0;
      } else {
        Atw = this.helper.toNumber(Aw.Aw);
        Ss = this.helper.toNumber(Aw.Ss);
        fwyd = this.helper.toNumber(Aw.fwyd);
      }
    }
    // 純かぶりと鉄筋辺長
    const dtt = Math.max(dt - Ast_dia/2 - stirrup_dia/2 ,0);
    const dct = Math.max(dc - Asc_dia/2 - stirrup_dia/2 ,0);
    const det = Math.max(de - Ase_dia/2 - stirrup_dia/2 ,0);
    let d0: number = h - dtt - dct; // 鉄筋長辺
    let b0: number = bw - det * 2;  // 鉄筋短辺
    if(d0 < b0){
      [d0, b0] = [b0, d0];
    }
    result['bo'] = b0;
    result['do'] = d0;
    
    const Am = b0 * d0 / Math.pow(1000, 2);

    result['Am'] = Am;

    // qw	=	Ａtw・fwyd／s
    const qw = Atw * fwyd / Ss;
    result['qw'] = qw;

    // ql	=	ΣAtl・fiyd／u
    const Atl = (Ast*fsyt) + (Asc*fsyc) + (Ase*fsye*2);
    const u = 2 * (b0 + d0);
    let ql = Atl / u;
    const _ql = 1.25 * qw;
    if(ql > _ql){
      ql = _ql;
    }
    result['ql'] = ql;

    // Ｍtyd	=	2・Ａm・(qw・ql)1/2 ／γb
    const Mtyd = 2 * Am * Math.pow(qw * ql, 0.5) / rb;
    result['Mtyd'] = Mtyd;

    // ③ 設計曲げモーメントが同時に作用する場合の設計ねじり耐力
    const Mtu_min = Math.min(Mtcd, Mtyd);
    result['Mtu_min'] = Mtu_min;

    let Mtud = 0;
    if( Mud >= Mudd ){
      if( ri * Md <= Mud-Mudd ){
        // (a) Ｍud ≧ Ｍ'ud かつ γi･Ｍd ≦ Ｍud‐Ｍ'ud の場合
        // Ｍtud	=	Ｍtu.min
        Mtud = Mtu_min;
      } else {
        // (b) Ｍud ≧ Ｍ'ud かつ Ｍud-Ｍ'ud ≦ γi･Ｍd ≦ Ｍud の場合
        // Ｍtud =	( Ｍtu.min-0.2･Ｍtcd )・( (Ｍud-γi･Ｍd)／Ｍ'ud )1/2 ＋0.2・Ｍtcd
        Mtud = ( Mtu_min - 0.2 * Mtcd ) * Math.pow( (Mud - ri * Md) / Mudd, 1/2 ) + 0.2 * Mtcd;
      }
    } else {
      // (c) Ｍud ＜ Ｍ'ud かつ γi･Ｍd ≦ Ｍud の場合
      // Ｍtud	=	( Ｍtu.min-0.2･Ｍtcd )・( 1-γi･Ｍd／Ｍud )1/2 ＋0.2・Ｍtcd
      Mtud = ( Mtu_min - 0.2 * Mtcd ) * Math.pow(1 - (ri * Md / Mud), 1/2 ) + 0.2 * Mtcd;
    }
    result['Mtud'] = Mtud;

    const Mtud_Ratio: number = ri * Mt / Mtud;
    result['Mtud_Ratio'] = Mtud_Ratio;

    // ④ 設計せん断力が同時に作用する場合の設計ねじり耐力
    // Ｍtud	=	Ｍtu.min・( 1-γi･Ｖd／Ｖud )＋0.2・Ｍtcd・γi･Ｖd／Ｖud
    const Mtvd = Mtu_min * (1 - ri * Vd / Vud) + 0.2 * Mtcd * ri * Vd / Vud;
    result['Mtvd'] = Mtvd;

    const Mtvd_Ratio: number = ri * Mt / Mtvd;
    result['Mtvd_Ratio'] = Mtvd_Ratio;

    // 計算結果
    result['Result'] = (Math.max(Mtud_Ratio, Mtvd_Ratio) > 1) ? 'NG' : 'OK';

    return result;
  }


}