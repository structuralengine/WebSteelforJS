import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcSafetyTorsionalMomentService } from "./calc-safety-torsional-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";

@Component({
  selector: 'app-result-safety-torsional-moment',
  templateUrl: './result-safety-torsional-moment.component.html',
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultSafetyTorsionalMomentComponent implements OnInit {
  public title: string = "安全性（破壊）";
  public page_index = "ap_14";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyTorsionalMomentPages: any[] = new Array();
  public isJREAST: boolean = false;
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcSafetyTorsionalMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("safetyTorsionalMoment");
      return;
    }

    // postする
    // this.isFulfilled = this.setPages(postData);//response["OutputData"]);
    // this.calc.isEnable = true;
    // this.summary.setSummaryTable("safetyTorsionalMoment", this.safetyTorsionalMomentPages);

    
    // 計算結果を集計する
    try {
      this.safetyTorsionalMomentPages = this.getSafetyPages(postData);
      this.isFulfilled = true;
      this.calc.isEnable = true;
      this.summary.setSummaryTable("safetyTorsionalMoment", this.safetyTorsionalMomentPages);
    } catch (e) {
      this.err = e.toString();
      this.isFulfilled = false;
      this.summary.setSummaryTable("safetyTorsionalMoment");
    }
    this.isLoading = false;
  }

  // 出力テーブル用の配列にセット
  public getSafetyPages(
    OutputData: any,
    title: string = "安全性（破壊）ねじりモーメントの照査結果",
    DesignForceList: any = this.calc.DesignForceList,
    safetyID: number = this.calc.safetyID
  ): any[] {
    const result: any[] = new Array();

    this.isJREAST = false;
    const speci2 = this.basic.get_specification2();
    if (speci2 === 2 || speci2 === 5) {
      this.isJREAST = true;
    }

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);
      const g = groupe[ig];

      page = {
        caption: title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag: false,
      };

      const safetyM = this.calc.getSafetyFactor('Md', g[0].g_id, safetyID);
      const safetyV = this.calc.getSafetyFactor('Vd', g[0].g_id, safetyID);

      let SRCFlag = false;
      for (const m of g) {
        for (const position of m.positions) {
          for (const side of ["上側引張", "下側引張"]) {
            const res = OutputData.find(
              (e) => e.index === position.index && e.side === side
            );
            if (res === undefined || res.length < 1) {
              continue;
            }

            const force = DesignForceList.find(
              (v) => v.index === res.index
            ).designForce.find((v) => v.side === res.side);

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag: false,
              };
              SRCFlag = false;
            }
            /////////////// まず計算 ///////////////
            const sectionM = this.result.getSection("Md", res, safetyM);
            const sectionV = this.result.getSection("Vd", res, safetyV);
            const member = sectionM.member;
            const shape = sectionM.shape;
            // const Ast = sectionM.Ast;

            const titleColumn = this.result.getTitleString(sectionM.member, position, side);
            const fck: any = this.helper.getFck(safetyV);

            ////////// 仮配置ここから //////////
            const data = this.calc.calcMtud(OutputData, res, sectionM, sectionV, fck, safetyM, safetyV, position.La, force);
            const column: any = this.getResultString(data);
            /////////////// タイトル ///////////////
            column['title1'] = { alien: "center", value: titleColumn.title1 };
            column['title2'] = { alien: "center", value: titleColumn.title2 };
            column['title3'] = { alien: "center", value: titleColumn.title3 };
            ///////////////// 鉄骨断面情報 /////////////////
            column['A'] = this.result.alien(sectionM.steels.A);
            column['Ix'] = this.result.alien(Math.round(sectionM.steels.Ix));
            column['Iy'] = this.result.alien(Math.round(sectionM.steels.Iy));
            ///////////////// 鉄骨情報 /////////////////
            column['Afgu'] = this.result.alien(Math.round(sectionM.steels.dim.Afgu));
            column['Afnu'] = this.result.alien(Math.round(sectionM.steels.dim.Afnu));
            column['Afgl'] = this.result.alien(Math.round(sectionM.steels.dim.Afgl));
            column['Afnl'] = this.result.alien(Math.round(sectionM.steels.dim.Afnl));
            column['Aw'] = this.result.alien(Math.round(sectionM.steels.dim.Aw));
            column['Yu'] = this.result.alien(null);
            column['Yl'] = this.result.alien(null);
            column['Xr'] = this.result.alien(null);
            column['Xl'] = this.result.alien(null);
            /////////////// 鉄骨強度 ///////////////
            column['fsyk'] = this.result.alien(null);
            /////////////// 鉄骨情報 ///////////////
            column['fwyd3'] = this.result.alien(null);
            /////////////// 総括表用 ///////////////
            column['index'] = position.index;
            column['side_summary'] = side;

            page.columns.push(column);
            ////////// 仮配置ここまで //////////
            continue;

            // const column: any = this.getResultString(
            //   this.calc.calcMtud(OutputData, res, sectionM, sectionV, fck, safetyM, safetyV, position.La, force)
            // );

            let fwyd3: number = 0
            if ('fsvy_Hweb' in sectionV.steel) {
              fwyd3 = (sectionV.steel.fsvy_Hweb.fvyd !== null) ?
                sectionV.steel.fsvy_Hweb.fvyd :
                sectionV.steel.fsvy_Iweb.fvyd;
            }

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(sectionM.steel.fsy_compress.fsy) !== null) SRC_pik = "fsy_compress";
            if (this.helper.toNumber(sectionM.steel.fsy_right.fsy) !== null) SRC_pik = "fsy_right";
            if (this.helper.toNumber(sectionM.steel.fsy_left.fsy) !== null) SRC_pik = "fsy_left";
            if (this.helper.toNumber(sectionM.steel.fsy_tension.fsy) !== null) SRC_pik = "fsy_tension";

            /////////////// タイトル ///////////////
            column['title1'] = { alien: "center", value: titleColumn.title1 };
            column['title2'] = { alien: "center", value: titleColumn.title2 };
            column['title3'] = { alien: "center", value: titleColumn.title3 };
            ///////////////// 形状 /////////////////
            column['B'] = this.result.alien(this.result.numStr(shape.B, 1));
            column['H'] = this.result.alien(this.result.numStr(shape.H, 1));
            ///////////////// 鉄骨情報 /////////////////
            column['steel_I_tension'] = this.result.alien(sectionM.steel.I.tension_flange);
            column['steel_I_web'] = this.result.alien(sectionM.steel.I.web);
            column['steel_I_compress'] = this.result.alien(sectionM.steel.I.compress_flange);
            column['steel_H_tension'] = this.result.alien(sectionM.steel.H.left_flange);
            column['steel_H_web'] = this.result.alien(sectionM.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
            column['tan'] = this.result.alien((sectionV.tan === 0) ? '-' : sectionV.tan, "center");
            column['Ast'] = this.result.alien(this.result.numStr(sectionM.Ast.Ast), "center");
            column['AstString'] = this.result.alien(sectionM.Ast.AstString, "center");
            column['dst'] = this.result.alien(this.result.numStr(sectionM.Ast.dst, 1), "center");
            column['tcos'] = this.result.alien(this.result.numStr((sectionM.Ast.tension !== null) ? sectionM.Ast.tension.cos : 1, 3), "center");
            /////////////// 圧縮鉄筋 ///////////////
            column['Asc'] = this.result.alien(this.result.numStr(sectionM.Asc.Asc), "center");
            column['AscString'] = this.result.alien(sectionM.Asc.AscString, "center");
            column['dsc'] = this.result.alien(this.result.numStr(sectionM.Asc.dsc, 1), "center");
            column['ccos'] = this.result.alien(this.result.numStr((sectionM.Asc.compress !== null) ? sectionM.Asc.compress.cos : 1, 3), "center");
            /////////////// 側面鉄筋 ///////////////
            // column['Ase'] = this.result.alien(this.result.numStr(Ast.Ase), "center");
            column['AseString'] = this.result.alien(sectionM.Ase.AseString, "center");
            column['dse'] = this.result.alien(this.result.numStr(sectionM.Ase.dse, 1), "center");
            /////////////// コンクリート情報 ///////////////
            column['fck'] = this.result.alien(fck.fck.toFixed(1), "center");
            column['rc'] = this.result.alien(fck.rc.toFixed(2), "center");
            column['fcd'] = this.result.alien(fck.fcd.toFixed(1), "center");
            /////////////// 鉄筋強度情報 ///////////////
            column['fsy'] = this.result.alien(this.result.numStr(sectionM.Ast.fsy, 1), "center");
            column['rs'] = this.result.alien(sectionV.Ast.rs.toFixed(2), "center");
            column['fsd'] = this.result.alien(this.result.numStr(sectionM.Ast.fsd, 1), "center");
            /////////////// 鉄骨情報 ///////////////
            if (SRC_pik in sectionM.steel) {
              column['fsy_steel'] = this.result.alien(this.result.numStr(sectionM.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(sectionM.steel[SRC_pik].fsd, 1), 'center');
            } else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(sectionM.steel.rs.toFixed(2), 'center');
            /////////////// 鉄骨情報 ///////////////
            column['fwyd3'] = this.result.alien(this.result.numStr(fwyd3, 0), 'center');
            if (sectionM.CFTFlag) {
              column['fwyd3'] = this.result.alien(this.result.numStr(sectionM.steel["fsvy_Iweb"].fvyd, 1), 'center');
            }


            /////////////// flag用 ///////////////
            column['bendFlag'] = (column.Asb.value !== '-'); //折り曲げ鉄筋の情報があればtrue、無ければfalse
            column['steelFlag'] = (sectionM.steel.flag); // 鉄骨情報があればtrue
            column['CFTFlag'] = (sectionM.CFTFlag);

            /////////////// 総括表用 ///////////////
            column['g_name'] = m.g_name;
            column['index'] = position.index;
            column['side_summary'] = side;
            column['shape_summary'] = sectionM.shapeName;
            column['B_summary'] = ('B_summary' in shape) ? shape.B_summary : shape.B;
            column['H_summary'] = ('H_summary' in shape) ? shape.H_summary : shape.H;

            // SRCのデータの有無を確認
            for (const src_key of ['steel_I_tension', 'steel_I_web', 'steel_I_compress',
              'steel_H_tension', 'steel_H_web']) {
              if (column[src_key].value !== '-') {
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
        for (let i = page.columns.length; i < 5; i++) {
          const column = {};
          for (let aa of Object.keys(page.columns[0])) {
            if (aa === "index" || aa === "side_summary" || aa === "shape_summary") {
              column[aa] = null;
            } else if (aa === "bendFlag" || aa === "steelFlag" || aa === "CFTFlag") {
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

  public getResultString(re: any): any {
    const result = {
      empty: { alien: "center", value: "-" },

      fck: { alien: "center", value: "-" },
      fcd: { alien: "center", value: "-" },
      fsyk_tension: { alien: "center", value: "-" },
      fsyk_compress: { alien: "center", value: "-" },
      fsvyk_web: { alien: "center", value: "-" },

      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      Vd: { alien: "center", value: "-" },
      Mt: { alien: "center", value: "-" },

      // ipu_cu: { alien: "center", value: "-" },
      // ipu_s: { alien: "center", value: "-" },
      // x: { alien: "center", value: "-" },
      
      bt: { alien: "center", value: "-" },
      bto: { alien: "center", value: "-" },
      chi_wt_bto: { alien: "center", value: "-" },
      chi_wt: { alien: "center", value: "-" },
      Rcr: { alien: "center", value: "-" },
      ko: { alien: "center", value: "-" },
      kb: { alien: "center", value: "-" },
      rho_bl: { alien: "center", value: "-" },
      bt_ratio: { alien: "center", value: "-" },
      bt_chi_wt_bt_ratio: { alien: "center", value: "-" },

      bsts: { alien: "center", value: "-" },
      Is: { alien: "center", value: "-" },
      bstso: { alien: "center", value: "-" },
      I: { alien: "center", value: "-" },
      bsts_ratio: { alien: "center", value: "-" },
      Is_I_ratio: { alien: "center", value: "-" },

      Mxd: { alien: "center", value: "-" },
      Myd: { alien: "center", value: "-" },
      // Nd: { alien: "center", value: "-" },
      Mucxd: { alien: "center", value: "-" },
      Mutxd: { alien: "center", value: "-" },
      Mucyd: { alien: "center", value: "-" },
      Mutyd: { alien: "center", value: "-" },
      Nud: { alien: "center", value: "-" },
      An: { alien: "center", value: "-" },
      rho_bg_culc: { alien: "center", value: "-" },
      lambda_e: { alien: "center", value: "-" },
      rho_bl_culc: { alien: "center", value: "-" },
      gamma_b1: { alien: "center", value: "-" },
      gamma_b2: { alien: "center", value: "-" },
      gamma_i: { alien: "center", value: "-" },
      ratio_M_compress: { alien: "center", value: "-" },
      ratio_M_tension: { alien: "center", value: "-" },

      // Vd: { alien: "center", value: "-" },
      Mtd: { alien: "center", value: "-" },
      Vyd: { alien: "center", value: "-" },
      Mtud: { alien: "center", value: "-" },
      // Aw: { alien: "center", value: "-" },
      At: { alien: "center", value: "-" },
      // gamma_b1: { alien: "center", value: "-" },
      // gamma_i: { alien: "center", value: "-" },
      ratio_VT_web: { alien: "center", value: "-" },

      ratio_MV_web_u: { alien: "center", value: "-" },
      ratio_MV_web_l: { alien: "center", value: "-" },

      /* deg_b: { alien: "center", value: "-" },
      Sb: { alien: "center", value: "-" },
      fvcd: { alien: "center", value: "-" },

      Bd: { alien: "center", value: "-" },
      pc: { alien: "center", value: "-" },
      Bp: { alien: "center", value: "-" },
      Mo: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },
      Vsd: { alien: "center", value: "-" },
      Vsd2: { alien: "center", value: "-" },

      ri: { alien: "center", value: "-" },
      Vyd_ratio: { alien: "center", value: "-" },

      M_rb: { alien: "center", value: "-" },
      // rb: { alien: "center", value: "-" },
      Mud: { alien: "center", value: "-" },
      Mudd: { alien: "center", value: "-" },
      V_rbt: { alien: "center", value: "-" },
      V_rbc: { alien: "center", value: "-" },
      V_rbs: { alien: "center", value: "-" },
      T_rbt: {alien:"center",value:"-"},
      Mu: { alien: "center", value: "-" },
      // Vyd: { alien: "center", value: "-" },
      fwcd: { alien: "center", value: "-" },
      Vwcd: { alien: "center", value: "-" },
      Vwcd_ratio: { alien: "center", value: "-" },

      Kt: { alien: "center", value: "-" },
      rbt: { alien: "center", value: "-" },

      Mtcud: { alien: "center", value: "-" },
      Mtcud_Ratio: { alien: "center", value: "-" },
      bo: { alien: "center", value: "-" },
      do: { alien: "center", value: "-" },
      Am: { alien: "center", value: "-" },
      qw: { alien: "center", value: "-" },
      ql: { alien: "center", value: "-" },
      Mtyd: { alien: "center", value: "-" },
      Mtu_min: { alien: "center", value: "-" },
      sigma_nd: { alien: "center", value: "-" },
      ftd: { alien: "center", value: "-" },
      Bn: { alien: "center", value: "-" },
      Bnt: { alien: "center", value: "-" },
      Mtcd: { alien: "center", value: "-" },
      Mtcd_Ratio: { alien: "center", value: "-" },
      Mtcd_Result: { alien: "center", value: "-" },

      Mtud1: { alien: "center", value: "-" },
      Mtud1_Ratio: { alien: "center", value: "-" },
      Mtud1_Result: { alien: "center", value: "-" },
      Mtud2: { alien: "center", value: "-" },
      Mtud2_Ratio: { alien: "center", value: "-" },
      Mtud2_Result: { alien: "center", value: "-" },
      Mtud3: { alien: "center", value: "-" },
      Mtud3_Ratio: { alien: "center", value: "-" },
      Mtud3_Result: { alien: "center", value: "-" },
      Mtud4: { alien: "center", value: "-" },
      Mtud4_Ratio: { alien: "center", value: "-" },
      Mtud4_Result: { alien: "center", value: "-" }, */


      // Mtvd: { alien: "center", value: "-" },
      // Mtvd_Ratio: { alien: "center", value: "-" },
      // Result: { alien: "center", value: "-" },
    };

    if (re === null) {
      return result;
    }

    // 鉄骨強度
    if ("fsyk_tension" in re) {
      result.fsyk_tension = { alien: "right", value: re.fsyk_tension.toFixed(1) };
    }
    if ("fsyk_compress" in re) {
      result.fsyk_compress = { alien: "right", value: re.fsyk_compress.toFixed(1) };
    }
    if ("fsvyk_web" in re) {
      result.fsvyk_web = { alien: "right", value: re.fsvyk_web.toFixed(1) };
    }

    // 断面力
    if ("Md" in re) {
      result.Md = { alien: "right", value: (Math.round(re.Md * 10) / 10).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: (Math.round(re.Nd * 10) / 10).toFixed(1) };
    }
    if ("Vd" in re) {
      result.Vd = { alien: "right", value: (Math.round(re.Vd * 10) / 10).toFixed(1) };
    }
    if ("Mt" in re) {
      result.Mt = { alien: "right", value: (Math.round(re.Mt * 10) / 10).toFixed(1) };
    }

    // 計算結果
    if ("bt" in re) {
      result.bt = { alien: "right", value: re.bt.toFixed(3) };
    }
    if ("bto" in re) {
      result.bto = { alien: "right", value: re.bto.toFixed(3) };
    }
    if ("chi_wt_bto" in re) {
      result.chi_wt_bto = { alien: "right", value: re.chi_wt_bto.toFixed(3) };
    }
    if ("chi_wt" in re) {
      result.chi_wt = { alien: "right", value: re.chi_wt.toFixed(3) };
    }
    if ("Rcr" in re) {
      result.Rcr = { alien: "right", value: re.Rcr.toFixed(3) };
    }
    if ("ko" in re) {
      result.ko = { alien: "right", value: re.ko.toFixed(3) };
    }
    if ("rho_bl" in re) {
      result.rho_bl = { alien: "right", value: re.rho_bl.toFixed(3) };
    }
    if ("bt_ratio" in re) {
      result.bt_ratio = { alien: "right", value: re.bt_ratio.toFixed(3) };
    }
    if ("bt_chi_wt_bt_ratio" in re) {
      result.bt_chi_wt_bt_ratio = { alien: "right", value: re.bt_chi_wt_bt_ratio.toFixed(3) };
    }

    if ("bsts" in re) {
      result.bsts = { alien: "right", value: re.bsts.toFixed(3) };
    }
    if ("Is" in re) {
      result.Is = { alien: "right", value: re.Is.toFixed(3) };
    }
    if ("bstso" in re) {
      result.bstso = { alien: "right", value: re.bstso.toFixed(3) };
    }
    if ("I" in re) {
      result.I = { alien: "right", value: re.I.toFixed(3) };
    }
    if ("bsts_ratio" in re) {
      result.bsts_ratio = { alien: "right", value: re.bsts_ratio.toFixed(3) };
    }

    if ("Mxd" in re) {
      result.Mxd = { alien: "right", value: re.Mxd.toFixed(3) };
    }
    if ("Myd" in re) {
      result.Myd = { alien: "right", value: re.Myd.toFixed(3) };
    }
    if ("Mucxd" in re) {
      result.Mucxd = { alien: "right", value: re.Mucxd.toFixed(3) };
    }
    if ("Mutxd" in re) {
      result.Mutxd = { alien: "right", value: re.Mutxd.toFixed(3) };
    }
    if ("Mucyd" in re) {
      result.Mucyd = { alien: "right", value: re.Mucyd.toFixed(3) };
    }
    if ("Mutyd" in re) {
      result.Mutyd = { alien: "right", value: re.Mutyd.toFixed(3) };
    }
    if ("Nud" in re) {
      result.Nud = { alien: "right", value: re.Nud.toFixed(3) };
    }
    if ("An" in re) {
      result.An = { alien: "right", value: re.An.toFixed(3) };
    }
    if ("rho_bg_culc" in re) {
      result.rho_bg_culc = { alien: "right", value: re.rho_bg_culc.toFixed(3) };
    }
    if ("lambda_e" in re) {
      result.lambda_e = { alien: "right", value: re.lambda_e.toFixed(3) };
    }
    if ("rho_bl_culc" in re) {
      result.rho_bl_culc = { alien: "right", value: re.rho_bl_culc.toFixed(3) };
    }
    if ("gamma_b1" in re) {
      result.gamma_b1 = { alien: "right", value: re.gamma_b1.toFixed(2) };
    }
    if ("gamma_b2" in re) {
      result.gamma_b2 = { alien: "right", value: re.gamma_b2.toFixed(2) };
    }
    if ("gamma_i" in re) {
      result.gamma_i = { alien: "right", value: re.gamma_i.toFixed(1) };
    }
    if ("ratio_M_compress" in re) {
      result.ratio_M_compress = { alien: "right", value: re.ratio_M_compress.toFixed(3) };
    }
    if ("ratio_M_tension" in re) {
      result.ratio_M_tension = { alien: "right", value: re.ratio_M_tension.toFixed(3) };
    }

    /*if ("Vd" in re) {
      result.Vd = { alien: "right", value: re.Vd.toFixed(3) };
    }*/
    if ("Mtd" in re) {
      result.Mtd = { alien: "right", value: re.Mtd.toFixed(3) };
    }
    if ("Vyd" in re) {
      result.Vyd = { alien: "right", value: re.Vyd.toFixed(3) };
    }
    if ("Mtud" in re) {
      result.Mtud = { alien: "right", value: re.Mtud.toFixed(3) };
    }
    /*if ("Aw" in re) {
      result.Aw = { alien: "right", value: re.Aw.toFixed(3) };
    }*/
    if ("At" in re) {
      result.At = { alien: "right", value: re.At.toFixed(3) };
    }
    /*if ("gamma_b1" in re) {
      result.gamma_b1 = { alien: "right", value: re.gamma_b1.toFixed(3) };
    }*/
    /*if ("gamma_i" in re) {
      result.gamma_i = { alien: "right", value: re.gamma_i.toFixed(3) };
    }*/
    if ("ratio_VT_web" in re) {
      result.ratio_VT_web = { alien: "right", value: re.ratio_VT_web.toFixed(3) };
    }

    if ("ratio_MV_web_u" in re) {
      result.ratio_MV_web_u = { alien: "right", value: re.ratio_MV_web_u.toFixed(3) };
    }
    if ("ratio_MV_web_l" in re) {
      result.ratio_MV_web_l = { alien: "right", value: re.ratio_MV_web_l.toFixed(3) };
    }

    return result;
  }
}
