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
      fsyk_shear: { alien: "center", value: "-" },
      fsvyk_web: { alien: "center", value: "-" },

      ////////// 断面力 //////////
      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      Vd: { alien: "center", value: "-" },
      Mtd: { alien: "center", value: "-" },

      // ipu_cu: { alien: "center", value: "-" },
      // ipu_s: { alien: "center", value: "-" },
      // x: { alien: "center", value: "-" },
      ////////// 基礎事項 //////////
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

      ////////// 引張側の幅厚比の照査 //////////
      bt_tension: { alien: "center", value: "-" },
      bto_tension: { alien: "center", value: "-" },
      chi_wt_bto_tension: { alien: "center", value: "-" },
      chi_bto_tension: { alien: "center", value: "-" },
      chi_tension: { alien: "center", value: "-" },
      Rcr_tension: { alien: "center", value: "-" },
      ko_tension: { alien: "center", value: "-" },
      rho_bl_tension: { alien: "center", value: "-" },
      bt_ratio_tension: { alien: "center", value: "-" },
      bt_chi_ratio_tension: { alien: "center", value: "-" },

      ////////// 引張側（両縁支持板）の幅厚比の照査 //////////
      bt_both_tension: { alien: "center", value: "-" },
      bto_both_tension: { alien: "center", value: "-" },
      chi_wt_bto_both_tension: { alien: "center", value: "-" },
      chi_bto_both_tension: { alien: "center", value: "-" },
      chi_both_tension: { alien: "center", value: "-" },
      Rcr_both_tension: { alien: "center", value: "-" },
      ko_both_tension: { alien: "center", value: "-" },
      rho_bl_both_tension: { alien: "center", value: "-" },
      bt_both_ratio_tension: { alien: "center", value: "-" },
      bt_chi_both_ratio_tension: { alien: "center", value: "-" },

      ////////// 圧縮側の幅厚比の照査 //////////
      bt_compress: { alien: "center", value: "-" },
      bto_compress: { alien: "center", value: "-" },
      chi_wt_bto_compress: { alien: "center", value: "-" },
      chi_bto_compress: { alien: "center", value: "-" },
      chi_compress: { alien: "center", value: "-" },
      Rcr_compress: { alien: "center", value: "-" },
      ko_compress: { alien: "center", value: "-" },
      rho_bl_compress: { alien: "center", value: "-" },
      bt_ratio_compress: { alien: "center", value: "-" },
      bt_chi_ratio_compress: { alien: "center", value: "-" },

      ////////// 引張側（両縁支持板）の幅厚比の照査 //////////
      bt_both_compress: { alien: "center", value: "-" },
      bto_both_compress: { alien: "center", value: "-" },
      chi_wt_bto_both_compress: { alien: "center", value: "-" },
      chi_bto_both_compress: { alien: "center", value: "-" },
      chi_both_compress: { alien: "center", value: "-" },
      Rcr_both_compress: { alien: "center", value: "-" },
      ko_both_compress: { alien: "center", value: "-" },
      rho_bl_both_compress: { alien: "center", value: "-" },
      bt_both_ratio_compress: { alien: "center", value: "-" },
      bt_chi_both_ratio_compress: { alien: "center", value: "-" },

      ////////// 腹板の幅厚比の照査 //////////
      dt_shear: { alien: "center", value: "-" },
      dto_shear: { alien: "center", value: "-" },
      chi_dto_shear: { alien: "center", value: "-" },
      chi_shear: { alien: "center", value: "-" },
      Rcr_shear: { alien: "center", value: "-" },
      kb_shear: { alien: "center", value: "-" },
      dt_ratio_shear: { alien: "center", value: "-" },
      dt_chi_ratio_shear: { alien: "center", value: "-" },

      ////////// 縦リブ（引張圧縮側）※分ける /////////
      bsts: { alien: "center", value: "-" },
      Is: { alien: "center", value: "-" },
      bstso: { alien: "center", value: "-" },
      I: { alien: "center", value: "-" },
      bsts_ratio: { alien: "center", value: "-" },
      Is_I_ratio: { alien: "center", value: "-" },

      ////////// 曲げモーメントを受ける部材 //////////
      Mxd: { alien: "center", value: "-" },
      Myd: { alien: "center", value: "-" },
      // Nd: { alien: "center", value: "-" },
      Mucxd: { alien: "center", value: "-" },
      Mutxd: { alien: "center", value: "-" },
      Mucyd: { alien: "center", value: "-" },
      Mutyd: { alien: "center", value: "-" },
      Nud: { alien: "center", value: "-" },
      Nuod: { alien: "center", value: "-" },
      Nuod2: { alien: "center", value: "-" },
      An: { alien: "center", value: "-" },
      rho_bg_culc: { alien: "center", value: "-" },
      lambda_e: { alien: "center", value: "-" },
      rho_bl_culc: { alien: "center", value: "-" },
      gamma_b1: { alien: "center", value: "-" },
      gamma_b2: { alien: "center", value: "-" },
      gamma_i: { alien: "center", value: "-" },
      ratio_M_compress: { alien: "center", value: "-" },
      ratio_M_tension: { alien: "center", value: "-" },

      ////////// せん断とねじりを受ける部材 //////////
      // Vd: { alien: "center", value: "-" },
      // Mtd: { alien: "center", value: "-" },
      Vyd: { alien: "center", value: "-" },
      Mtuzd: { alien: "center", value: "-" },
        // Mtuyd: { alien: "center", value: "-" },
      Aw: { alien: "center", value: "-" },
      At: { alien: "center", value: "-" },
      // gamma_b1: { alien: "center", value: "-" },
      // gamma_i: { alien: "center", value: "-" },
      ratio_VT_web: { alien: "center", value: "-" },

      ////////// 曲げとせん断を受ける部材 //////////
      // Mxd: { alien: "center", value: "-" },
      // Myd: { alien: "center", value: "-" },
      // Nd: { alien: "center", value: "-" },
      // Vd: { alien: "center", value: "-" },
      // Mt: { alien: "center", value: "-" },
      // Mucxd: { alien: "center", value: "-" },
      // Mutxd: { alien: "center", value: "-" },
      // Mucyd: { alien: "center", value: "-" },
      // Mutyd: { alien: "center", value: "-" },
      // Nud: { alien: "center", value: "-" },
      // Vyd: { alien: "center", value: "-" },
      // Mtuzd: { alien: "center", value: "-" },
      // An: { alien: "center", value: "-" },
      // Aw: { alien: "center", value: "-" },
      // At: { alien: "center", value: "-" },
      // gamma_b1: { alien: "center", value: "-" },
      // gamma_b2: { alien: "center", value: "-" },
      // gamma_i: { alien: "center", value: "-" },
      ratio_MV_tension_u: { alien: "center", value: "-" },
      ratio_MV_tension_l: { alien: "center", value: "-" },
      ratio_MV_web_u: { alien: "center", value: "-" },
      ratio_MV_web_l: { alien: "center", value: "-" },
      ratio_MV_web: { alien: "center", value: "-" },
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
    if ("fsyk_shear" in re) {
      result.fsyk_shear = { alien: "right", value: re.fsyk_shear.toFixed(1) };
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
      result.Mtd = { alien: "right", value: (Math.round(re.Mt * 10) / 10).toFixed(1) };
    }

    // 計算結果
    // 幅厚比の照査
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

    ////////// 引張側の幅厚比の照査 //////////
    if ("bt_tension" in re) {
      result.bt_tension = { alien: "right", value: re.bt_tension.toFixed(3) };
    }
    if ("bto_tension" in re) {
      result.bto_tension = { alien: "right", value: re.bto_tension.toFixed(3) };
    }
    if ("chi_bto_tension" in re) {
      result.chi_bto_tension.alien = "right";
      if (re.chi_bto_tension !== 0) {
        result.chi_bto_tension.value = re.chi_bto_tension.toFixed(3);
      } else {
        result.chi_bto_tension.value = '---';
      }
    }
    if ("chi_tension" in re) {
      result.chi_tension.alien = "right";
      if (re.chi_tension !== 0) {
        result.chi_tension.value = re.chi_tension.toFixed(3);
      } else {
        result.chi_tension.value = '---';
      }
    }
    if ("Rcr_tension" in re) {
      result.Rcr_tension.alien = "right";
      if (re.Rcr_tension !== 0) {
        result.Rcr_tension.value = re.Rcr_tension.toFixed(3);
      } else {
        result.Rcr_tension.value = '---';
      }
    }
    if ("k_tension" in re) {
      result.ko_tension.alien = "right";
      if (re.k_tension !== 0) {
        result.ko_tension.value = re.k_tension.toFixed(3);
      } else {
        result.ko_tension.value = '---';
      }
    }
    if ("rho_bl_tension" in re) {
      result.rho_bl_tension = { alien: "right", value: re.rho_bl_tension.toFixed(3) };
    }
    if ("bt_tension" in re && "bto_tension" in re) {
      result.bt_ratio_tension = { 
        alien: "right", 
        value: (re.bt_tension / re.bto_tension < 1.0) ? 'OK' : 'NG' 
      };
    }
    if ("bt_tension" in re && "chi_bto_tension" in re) {
      result.bt_chi_ratio_tension.alien = "right";
      if (re.chi_bto_tension !== 0) {
        if (re.bt_tension / re.chi_bto_tension < 1.0) {
          result.bt_chi_ratio_tension.value = 'OK';
        } else {
          result.bt_chi_ratio_tension.value = 'NG';
        }
      } else {
        result.bt_chi_ratio_tension.value = '---';
      }
    }

    ////////// 引張側（両縁支持板）の幅厚比の照査 //////////
    if ("bt_both_tension" in re) {
      result.bt_both_tension = { alien: "right", value: re.bt_both_tension.toFixed(3) };
    }
    if ("bto_both_tension" in re) {
      result.bto_both_tension = { alien: "right", value: re.bto_both_tension.toFixed(3) };
    }
    if ("chi_bto_both_tension" in re) {
      result.chi_bto_both_tension.alien = "right";
      if (re.chi_bto_both_tension !== 0) {
        result.chi_bto_both_tension.value = re.chi_bto_both_tension.toFixed(3);
      } else {
        result.chi_bto_both_tension.value = '---';
      }
    }
    if ("chi_both_tension" in re) {
      result.chi_both_tension.alien = "right";
      if (re.chi_both_tension !== 0) {
        result.chi_both_tension.value = re.chi_both_tension.toFixed(3);
      } else {
        result.chi_both_tension.value = '---';
      }
    }
    if ("Rcr_both_tension" in re) {
      result.Rcr_both_tension.alien = "right";
      if (re.Rcr_both_tension !== 0) {
        result.Rcr_both_tension.value = re.Rcr_both_tension.toFixed(3);
      } else {
        result.Rcr_both_tension.value = '---';
      }
    }
    if ("k_both_tension" in re) {
      result.ko_both_tension.alien = "right";
      if (re.k_both_tension !== 0) {
        result.ko_both_tension.value = re.k_both_tension.toFixed(3);
      } else {
        result.ko_both_tension.value = '---';
      }
    }
    if ("rho_bl_both_tension" in re) {
      result.rho_bl_both_tension = { alien: "right", value: re.rho_bl_both_tension.toFixed(3) };
    }
    if ("bt_both_tension" in re && "bto_both_tension" in re) {
      result.bt_both_ratio_tension = { 
        alien: "right", 
        value: (re.bt_both_tension / re.bto_both_tension < 1.0) ? 'OK' : 'NG' 
      };
    }
    if ("bt_both_tension" in re && "chi_bto_both_tension" in re) {
      result.bt_chi_both_ratio_tension.alien = "right";
      if (re.chi_bto_both_tension !== 0) {
        if (re.bt_both_tension / re.chi_bto_both_tension < 1.0) {
          result.bt_chi_both_ratio_tension.value = 'OK';
        } else {
          result.bt_chi_both_ratio_tension.value = 'NG';
        }
      } else {
        result.bt_chi_both_ratio_tension.value = '---';
      }
    }

    ////////// 圧縮側の幅厚比の照査 //////////
    if ("bt_compress" in re) {
      result.bt_compress = { alien: "right", value: re.bt_compress.toFixed(3) };
    }
    if ("bto_compress" in re) {
      result.bto_compress = { alien: "right", value: re.bto_compress.toFixed(3) };
    }
    if ("chi_bto_compress" in re) {
      result.chi_bto_compress.alien = "right";
      if (re.chi_bto_compress !== 0) {
        result.chi_bto_compress.value = re.chi_bto_compress.toFixed(3);
      } else {
        result.chi_bto_compress.value = '---';
      }
    }
    if ("chi_compress" in re) {
      result.chi_compress.alien = "right";
      if (re.chi_compress !== 0) {
        result.chi_compress.value = re.chi_compress.toFixed(3);
      } else {
        result.chi_compress.value = '---';
      }
    }
    if ("Rcr_compress" in re) {
      result.Rcr_compress.alien = "right";
      if (re.Rcr_compress !== 0) {
        result.Rcr_compress.value = re.Rcr_compress.toFixed(3);
      } else {
        result.Rcr_compress.value = '---';
      }
    }
    if ("k_compress" in re) {
      result.ko_compress.alien = "right";
      if (re.k_compress !== 0) {
        result.ko_compress.value = re.k_compress.toFixed(3);
      } else {
        result.ko_compress.value = '---';
      }
    }
    if ("rho_bl_compress" in re) {
      result.rho_bl_compress = { alien: "right", value: re.rho_bl_compress.toFixed(3) };
    }
    if ("bt_compress" in re && "bto_compress" in re) {
      result.bt_ratio_compress = { 
        alien: "right", 
        value: (re.bt_compress / re.bto_compress < 1.0) ? 'OK' : 'NG',
      };
    }
    if ("bt_compress" in re && "chi_bto_compress" in re) {
      result.bt_chi_ratio_compress.alien = "right";
      if (re.chi_bto_compress !== 0) {
        if (re.bt_compress / re.chi_bto_compress < 1.0) {
          result.bt_chi_ratio_compress.value = 'OK';
        } else {
          result.bt_chi_ratio_compress.value = 'NG';
        }
      } else {
        result.bt_chi_ratio_compress.value = '---';
      }
    }

    ////////// 圧縮側（両縁支持板）の幅厚比の照査 //////////
    if ("bt_both_compress" in re) {
      result.bt_both_compress = { alien: "right", value: re.bt_both_compress.toFixed(3) };
    }
    if ("bto_both_compress" in re) {
      result.bto_both_compress = { alien: "right", value: re.bto_both_compress.toFixed(3) };
    }
    if ("chi_bto_both_compress" in re) {
      result.chi_bto_both_compress.alien = "right";
      if (re.chi_bto_both_compress !== 0) {
        result.chi_bto_both_compress.value = re.chi_bto_both_compress.toFixed(3);
      } else {
        result.chi_bto_both_compress.value = '---';
      }
    }
    if ("chi_both_compress" in re) {
      result.chi_both_compress.alien = "right";
      if (re.chi_both_compress !== 0) {
        result.chi_both_compress.value = re.chi_both_compress.toFixed(3);
      } else {
        result.chi_both_compress.value = '---';
      }
    }
    if ("Rcr_both_compress" in re) {
      result.Rcr_both_compress.alien = "right";
      if (re.Rcr_both_compress !== 0) {
        result.Rcr_both_compress.value = re.Rcr_both_compress.toFixed(3);
      } else {
        result.Rcr_both_compress.value = '---';
      }
    }
    if ("k_both_compress" in re) {
      result.ko_both_compress.alien = "right";
      if (re.k_both_compress !== 0) {
        result.ko_both_compress.value = re.k_both_compress.toFixed(3);
      } else {
        result.ko_both_compress.value = '---';
      }
    }
    if ("rho_bl_both_compress" in re) {
      result.rho_bl_both_compress = { alien: "right", value: re.rho_bl_both_compress.toFixed(3) };
    }
    if ("bt_both_compress" in re && "bto_both_compress" in re) {
      result.bt_both_ratio_compress = { 
        alien: "right", 
        value: (re.bt_both_compress / re.bto_both_compress < 1.0) ? 'OK' : 'NG' 
      };
    }
    if ("bt_both_compress" in re && "chi_bto_both_compress" in re) {
      result.bt_chi_both_ratio_compress.alien = "right";
      if (re.chi_bto_both_compress !== 0) {
        if (re.bt_both_compress / re.chi_bto_both_compress < 1.0) {
          result.bt_chi_both_ratio_compress.value = 'OK';
        } else {
          result.bt_chi_both_ratio_compress.value = 'NG';
        }
      } else {
        result.bt_chi_both_ratio_compress.value = '---';
      }
    }

    ////////// 腹板の幅厚比の照査 //////////
    if ("dt_shear" in re) {
      result.dt_shear = { alien: "right", value: re.dt_shear.toFixed(3) };
    }
    if ("dto_shear" in re) {
      result.dto_shear = { alien: "right", value: re.dto_shear.toFixed(3) };
    }
    if ("chi_dto_shear" in re) {
      result.chi_dto_shear.alien = "right";
      if (re.chi_dto_shear !== 0) {
        result.chi_dto_shear.value = re.chi_dto_shear.toFixed(1);
      } else {
        result.chi_dto_shear.value = '---';
      }
    }
    if ("chi_shear" in re) {
      result.chi_shear.alien = "right";
      if (re.chi_shear !== 0) {
        result.chi_shear.value = re.chi_shear.toFixed(2);
      } else {
        result.chi_shear.value = '---';
      }
    }
    if ("Rcr_shear" in re) {
      result.Rcr_shear.alien = "right";
      if (re.Rcr_shear !== 0) {
        result.Rcr_shear.value = re.Rcr_shear.toFixed(3);
      } else {
        result.Rcr_shear.value = '---';
      }
    }
    if ("kb_shear" in re) {
      result.kb_shear.alien = "right";
      if (re.kb_shear !== 0) {
        result.kb_shear.value = re.kb_shear.toFixed(3);
      } else {
        result.kb_shear.value = '---';
      }
    }
    if ("dt_shear" in re && "dto_shear" in re) {
      result.dt_ratio_shear = { 
        alien: "right", 
        value: (re.dt_shear / re.dto_shear < 1.0) ? 'OK' : 'NG' 
      };
    }
    if ("dt_shear" in re && "chi_dto_shear" in re) {
      result.dt_chi_ratio_shear.alien = "right";
      if (re.chi_dto_shear !== 0) {
        if (re.dt_shear / re.chi_dto_shear < 1.0) {
          result.dt_chi_ratio_shear.value = 'OK';
        } else {
          result.dt_chi_ratio_shear.value = 'NG';
        }
      } else {
        result.dt_chi_ratio_shear.value = '---';
      }
    }

    ////////// 縦リブ（引張圧縮側）の幅厚比の照査 ※分ける /////////
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

    ////////// 曲げモーメントを受ける部材 //////////
    if ("Mxd" in re) {
      result.Mxd = { alien: "right", value: re.Mxd.toFixed(1) };
    }
    if ("Myd" in re) {
      result.Myd = { alien: "right", value: re.Myd.toFixed(1) };
    }
    /* if ("Nd" in re) {
      result.Nd = { alien: "right", value: re.Nd.toFixed(1) };
    } */
    if ("Mucxd" in re) {
      result.Mucxd = { alien: "right", value: re.Mucxd.toFixed(1) };
    }
    if ("Mutxd" in re) {
      result.Mutxd = { alien: "right", value: re.Mutxd.toFixed(1) };
    }
    if ("Mucyd" in re) {
      result.Mucyd = { alien: "right", value: re.Mucyd.toFixed(1) };
    }
    if ("Mutyd" in re) {
      result.Mutyd = { alien: "right", value: re.Mutyd.toFixed(1) };
    }
    if ("Nud" in re) {
      result.Nud = { alien: "right", value: re.Nud.toFixed(1) };
    }
    /* if ("Nuod" in re) {
      result.Nuod = { alien: "right", value: re.Nuod.toFixed(1) };
    }
    if ("Nuod2" in re) {
      result.Nuod2 = { alien: "right", value: re.Nuod2.toFixed(1) };
    } */
    if ("An" in re) {
      result.An = { alien: "right", value: re.An.toFixed(0) };
    }
    if ("rho_bg_culc" in re) {
      result.rho_bg_culc = { alien: "right", value: re.rho_bg_culc.toFixed(2) };
    }
    if ("lambda_e" in re) {
      result.lambda_e = { alien: "right", value: re.lambda_e.toFixed(2) };
    }
    if ("rho_bl_culc" in re) {
      result.rho_bl_culc = { alien: "right", value: re.rho_bl_culc.toFixed(2) };
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

    ////////// せん断とねじりを受ける部材 //////////
    /*if ("Vd" in re) {
      result.Vd = { alien: "right", value: re.Vd.toFixed(3) };
    }*/
    /* if ("Mt" in re) {
      result.Mtd = { alien: "right", value: re.Mtd.toFixed(1) };
    } */
    if ("Vyd" in re) {
      result.Vyd = { alien: "right", value: re.Vyd.toFixed(1) };
    }
    if ("Mtuzd" in re) {
      result.Mtuzd = { alien: "right", value: re.Mtuzd.toFixed(1) };
    }
    /* if ("Mtuyd" in re) {
      result.Mtuyd = { alien: "right", value: re.Mtuyd.toFixed(1) };
    } */
    if ("Aw" in re) {
      result.Aw = { alien: "right", value: re.Aw.toFixed(3) };
    }
    if ("At" in re) {
      result.At = { alien: "right", value: re.At.toFixed(0) };
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

    ////////// せん断とねじりを受ける部材 //////////
    if ("ratio_MV_tension_u" in re) {
      result.ratio_MV_tension_u = { alien: "right", value: re.ratio_MV_tension_u.toFixed(3) };
    }
    if ("ratio_MV_tension_l" in re) {
      result.ratio_MV_tension_l = { alien: "right", value: re.ratio_MV_tension_l.toFixed(3) };
    }
    if ("ratio_MV_web_u" in re) {
      result.ratio_MV_web_u = { alien: "right", value: re.ratio_MV_web_u.toFixed(3) };
    }
    if ("ratio_MV_web_l" in re) {
      result.ratio_MV_web_l = { alien: "right", value: re.ratio_MV_web_l.toFixed(3) };
    }
    if ("ratio_MV_web" in re) {
      result.ratio_MV_web = { alien: "right", value: re.ratio_MV_web.toFixed(3) };
    }

    return result;
  }
}
