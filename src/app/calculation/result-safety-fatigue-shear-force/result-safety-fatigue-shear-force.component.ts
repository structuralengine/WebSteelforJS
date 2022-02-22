import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcSafetyFatigueShearForceService } from "./calc-safety-fatigue-shear-force.service";
import { ResultDataService } from "../result-data.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { InputFatiguesService } from "src/app/components/fatigues/fatigues.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";

@Component({
  selector: "app-result-safety-fatigue-shear-force",
  templateUrl: "./result-safety-fatigue-shear-force.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultSafetyFatigueShearForceComponent implements OnInit {
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyFatigueShearForcepages: any[] = new Array();
  public NA: number; // A列車の回数
  public NB: number; // B列車の回数
  private title = "安全性（疲労破壊）せん断力の照査結果";
  public page_index = 'ap_4';
  public isSRC: boolean = false;

  constructor(
    private calc: CalcSafetyFatigueShearForceService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private fatigue: InputFatiguesService,
    private summary: CalcSummaryTableService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    const trainCount: number[] = this.calc.getTrainCount();
    this.NA = trainCount[0];
    this.NB = trainCount[1];

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("safetyFatigueShearForce");
      return;
    }

    // 計算結果を集計する
    try {
      this.safetyFatigueShearForcepages = this.setSafetyFatiguePages(postData);
      this.isFulfilled = true;
      this.calc.isEnable = true;
      this.summary.setSummaryTable("safetyFatigueShearForce", this.safetyFatigueShearForcepages);
    } catch (e) {
      this.err = e.toString();
      this.isFulfilled = false;
      this.summary.setSummaryTable("safetyFatigueShearForce");
    }
    this.isLoading = false;
  }

  // 出力テーブル用の配列にセット
  public setSafetyFatiguePages(OutputData: any): any[] {
    const result: any[] = new Array();

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);

      page = {
        caption: this.title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag : false,
      };

      const safety = this.calc.getSafetyFactor(groupe[ig][0].g_id);

      let SRCFlag = false;
      for (const m of groupe[ig]) {
        for (const position of m.positions) {
          const fatigueInfo = this.fatigue.getCalcData(position.index);
          for (const side of ["上側引張", "下側引張"]) {

            const res = OutputData.filter(
              (e) => e.index === position.index && e.side === side
            );
            if (res === undefined || res.length < 1) {
              continue;
            }

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: this.title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag : false,
              };
              SRCFlag = false;
            }
            /////////////// まず計算 ///////////////
            let section: any = null;
            // try {
              section = this.result.getSteelStruct("Vd", res[0], safety);
            // } catch (e) {
              // continue;
            // }
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString( section.member, position, side );
            const fck: any = this.helper.getFck(safety);
            const value = this.calc.calcFatigue(res, section, fck, safety, fatigueInfo);
            ////////// 仮配置ここから //////////
            const column: any = this.getResultString(value);
            /////////////// タイトル ///////////////
            column['title1'] = { alien: "center", value: titleColumn.title1 };
            column['title2'] = { alien: "center", value: titleColumn.title2 };
            column['title3'] = { alien: "center", value: titleColumn.title3 };
            ///////////////// 鉄骨断面情報 /////////////////
            column['A'] = this.result.alien(section.steels.A);
            column['Ix'] = this.result.alien(section.steels.Ix);
            ///////////////// 鉄骨情報 /////////////////
            column['Afgu'] = this.result.alien(null);
            column['Afgl'] = this.result.alien(null);
            column['Aw'] = this.result.alien(null);
            column['Yu'] = this.result.alien(null);
            column['Yl'] = this.result.alien(null);
            column['t'] = this.result.alien(null);
            /////////////// 鉄筋強度情報 ///////////////
            column['fsy'] = this.result.alien(null);
            column['rs'] = this.result.alien(null);
            column['fsd'] = this.result.alien(null);
            /////////////// 鉄骨情報 ///////////////
            column['fsy_steel'] = this.result.alien(null);
            column['fsd_steel'] = this.result.alien(null);
            column['fsy_steel'] = this.result.alien(null);
            column['fsd_steel'] = this.result.alien(null);
            column['rs_steel'] = this.result.alien(null);
            /////////////// 鉄骨情報 ///////////////
            column['fwyd3'] = this.result.alien(null);
            /////////////// 総括表用 ///////////////
            column['index'] = position.index;
            column['side_summary'] = side;

            page.columns.push(column);
            ////////// 仮配置ここまで //////////
            continue;

            //const value = this.calc.calcFatigue(res, section, fck, safety, fatigueInfo);
            if(value.N === 0) continue;
            // const column: any = this.getResultString(value );

            let fwyd3: number = 0
            if('fsvy_Hweb' in section.steel) {
              fwyd3 = (section.steel.fsvy_Hweb.fvyd !== null) ? 
              section.steel.fsvy_Hweb.fvyd :
              section.steel.fsvy_Iweb.fvyd ;
            }

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(section.steel.fsy_compress.fsy) !== null) SRC_pik = "fsy_compress" ;
            if (this.helper.toNumber(section.steel.fsy_right.fsy) !== null) SRC_pik = "fsy_right" ;
            if (this.helper.toNumber(section.steel.fsy_left.fsy) !== null) SRC_pik = "fsy_left" ;
            if (this.helper.toNumber(section.steel.fsy_tension.fsy) !== null) SRC_pik = "fsy_tension" ;
                    
            /////////////// タイトル ///////////////
            column['title1'] = { alien: "center", value: titleColumn.title1 };
            column['title2'] = { alien: "center", value: titleColumn.title2 };
            column['title3'] =  { alien: "center", value: titleColumn.title3 };
            ///////////////// 形状 /////////////////
            column['B'] = this.result.alien(this.result.numStr(shape.B,1));
            column['H'] = this.result.alien(this.result.numStr(shape.H,1));
            ///////////////// 鉄骨情報 /////////////////
            column['steel_I_tension'] = this.result.alien(section.steel.I.tension_flange);
            column['steel_I_web'] = this.result.alien(section.steel.I.web);
            column['steel_I_compress'] = this.result.alien(section.steel.I.compress_flange);
            column['steel_H_tension'] = this.result.alien(section.steel.H.left_flange);
            column['steel_H_web'] = this.result.alien(section.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
            column['tan'] = this.result.alien(( section.tan === 0 ) ? '-' : section.tan, "center");
            column['Ast'] = this.result.alien(this.result.numStr(section.Ast.Ast), "center");
            column['AstString'] = this.result.alien(section.Ast.AstString, "center");
            column['dst'] = this.result.alien(this.result.numStr(section.Ast.dst, 1), "center");
            column['tcos'] = this.result.alien(this.result.numStr((section.Ast.tension!==null)?section.Ast.tension.cos: 1, 3), "center");
            /////////////// コンクリート情報 ///////////////
            column['fck'] = this.result.alien(fck.fck.toFixed(1), "center");
            column['rc'] = this.result.alien(fck.rc.toFixed(2), "center");
            column['fcd'] = this.result.alien(fck.fcd.toFixed(1), "center");
            /////////////// 鉄筋強度情報 ///////////////
            column['fsy'] = this.result.alien(this.result.numStr(section.Ast.fsy, 1), "center");
            column['rs'] = this.result.alien(section.Ast.rs.toFixed(2), "center");
            column['fsd'] = this.result.alien(this.result.numStr(section.Ast.fsd, 1), "center");
            column['fwud'] = this.result.alien(section.Aw.fwud, "center");
            /////////////// 鉄骨情報 ///////////////
            if(SRC_pik in section.steel){
              column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
            }else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');
            column['rs2'] = column.rs;
            /////////////// 鉄骨情報及びそれに伴う係数 ///////////////
            column['fwyd3'] = this.result.alien(this.result.numStr(fwyd3, 0), 'center');

            /////////////// Flag用 ///////////////
            column['bendFlag'] = (column.Asb.value!=='-');  //折り曲げ鉄筋の情報があればtrue、無ければfalse
            column['steelFlag'] = (section.steel.flag); // 鉄骨情報があればtrue
            column['CFTFlag'] = (section.CFTFlag);
            /////////////// 総括表用 ///////////////
            column['g_name'] = m.g_name;
            column['index'] = position.index;
            column['side_summary'] = side;
            column['shape_summary'] = section.shapeName;
            column['B_summary'] = ('B_summary' in shape) ? shape.B_summary : shape.B;
            column['H_summary'] = ('H_summary' in shape) ? shape.H_summary : shape.H;
            
            // SRCのデータの有無を確認
            for(const src_key of ['steel_I_tension', 'steel_I_web', 'steel_I_compress',
                                  'steel_H_tension','steel_H_web']){
              if(column[src_key].value !== '-'){
                SRCFlag = true
                this.isSRC = true
              }
            }
            page.columns.push(column);
          }
        }
      }
      // 最後のページ
      if (page.columns.length > 0) {
        for(let i=page.columns.length; i<5; i++){
          const column = {};
          for (let aa of Object.keys(page.columns[0])) {
            if (aa === "index" || aa === "side_summary" || aa === "shape_summary") {
              column[aa] = null;
            } else if (aa === "bendFlag" || aa === "steelFlag" || aa === "CFTFlag"){
              column[aa] = false;
            } else {
              column[aa] = { alien: 'center', value: '-' };
            }
          }
          page.columns.push(column);
        }
        page.SRCFlag = SRCFlag;
        result.push(page);
      }
    }
    return result;
  }

  private getResultString(re: any): any {
    const result = {
      empty: { alien: "center", value: "-" },

      Vpd: { alien: "center", value: "-" },
      Mpd: { alien: "center", value: "-" },
      Npd: { alien: "center", value: "-" },

      Vrd: { alien: "center", value: "-" },
      Mrd: { alien: "center", value: "-" },
      Nrd: { alien: "center", value: "-" },

      fvcd: { alien: "center", value: "-" },
      rbc: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },

      kr: { alien: "center", value: "-" },

      sigma_max: { alien: "center", value: "-" },
      sigma_min: { alien: "center", value: "-" },
      delta_fud: { alien: "center", value: "-" },
      delta_cod: { alien: "center", value: "-" },
      CR: { alien: "center", value: "-" },
      Ct: { alien: "center", value: "-" },
      delta_cod2: { alien: "center", value: "-" },
      gamma_a: { alien: "center", value: "-" },
      gamma_i: { alien: "center", value: "-" },
      ratio: { alien: "center", value: "-" },
      result: { alien: "center", value: "-" },

      ratio2: { alien: "center", value: "-" },
      result2: { alien: "center", value: "-" },
    };

    if (re === null) {
      return result;
    }

    // 断面力
    if ("Vpd" in re) {
      result.Vpd = { alien: "right", value: (Math.round(re.Vpd*10)/10).toFixed(1) };
    }
    if ("Mpd" in re) {
      result.Mpd = { alien: "right", value: (Math.round(re.Mpd*10)/10).toFixed(1) };
    }
    if ("Npd" in re) {
      result.Npd = { alien: "right", value: (Math.round(re.Npd*10)/10).toFixed(1) };
    }

    if ("Vrd" in re) {
      result.Vrd = { alien: "right", value: (Math.round(re.Vrd*10)/10).toFixed(1) };
    }
    if ("Mrd" in re) {
      result.Mrd = { alien: "right", value: (Math.round(re.Mrd*10)/10).toFixed(1) };
    }
    if ("Nrd" in re) {
      result.Nrd = { alien: "right", value: (Math.round(re.Nrd*10)/10).toFixed(1) };
    }

    // 耐力
    if ("fvcd" in re) {
      result.fvcd = { alien: "right", value: re.fvcd.toFixed(3) };
    }
    if ("rbc" in re) {
      result.rbc = { alien: "right", value: re.rbc.toFixed(2) };
    }
    if ("Vcd" in re) {
      result.Vcd = { alien: "right", value: re.Vcd.toFixed(1) };
    }
    if ("kr" in re) {
      result.kr = { alien: "right", value: re.kr.toFixed(1) };
    }

    if ("sigma_min" in re) {
      result.sigma_min = { 
        alien: "right", 
        value: (re.sigma_min < 0) ? re.sigma_min.toFixed(2) + ' → 0' : re.sigma_min.toFixed(2) 
      };
    }
    let ratio = 0;
    if ("ratio" in re) {
      result.ratio.value = re.ratio.toFixed(3).toString() + ((re.ratio < 1) ? ' < 1.00' : ' > 1.00');
      ratio = re.ratio;
    }
    if (ratio < 1) {
      result.result.value = "OK";
    } else {
      result.result.value = "NG";
    }
    ratio = 0;
    if ("ratio2" in re) {
      result.ratio2.value = re.ratio2.toFixed(3).toString() + ((re.ratio2 < 1) ? ' < 1.00' : ' > 1.00');
      ratio = re.ratio2;
    }
    if (ratio < 1) {
      result.result2.value = "OK";
    } else {
      result.result2.value = "NG";
    }

    return result;
  }
}
