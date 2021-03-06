import { Component, OnInit } from "@angular/core";
// import { CalcSafetyMomentService } from "../result-safety-moment/calc-safety-moment.service";
// import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
// import { CalcSafetyFatigueMomentService } from "../result-safety-fatigue-moment/calc-safety-fatigue-moment.service";
import { CalcSafetyFatigueShearForceService } from "../result-safety-fatigue-shear-force/calc-safety-fatigue-shear-force.service";
// import { CalcServiceabilityMomentService } from "../result-serviceability-moment/calc-serviceability-moment.service";
// import { CalcServiceabilityShearForceService } from "../result-serviceability-shear-force/calc-serviceability-shear-force.service";
// import { CalcDurabilityMomentService } from "../result-durability-moment/calc-durability-moment.service";
// import { CalcRestorabilityMomentService } from "../result-restorability-moment/calc-restorability-moment.service";
// import { CalcRestorabilityShearForceService } from "../result-restorability-shear-force/calc-restorability-shear-force.service";
// import { CalcEarthquakesMomentService } from "../result-earthquakes-moment/calc-earthquakes-moment.service";
// import { CalcEarthquakesShearForceService } from "../result-earthquakes-shear-force/calc-earthquakes-shear-force.service";
import { InputMembersService } from "src/app/components/members/members.service";
import { CalcSafetyTorsionalMomentService } from "../result-safety-torsional-moment/calc-safety-torsional-moment.service";
// import { CalcServiceabilityTorsionalMomentService } from "../result-serviceability-torsional-moment/calc-serviceability-torsional-moment.service";
// import { CalcRestorabilityTorsionalMomentService } from "../result-restorability-torsional-moment/calc-restorability-torsional-moment.service";
import { CalcEarthquakesTosionalMomentService } from "../result-earthquakes-torsional-moment/calc-earthquakes-tosional-moment.service";

@Component({
  selector: "app-section-force-list",
  templateUrl: "./section-force-list.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class SectionForceListComponent implements OnInit {
  public pages: object[];

  public isLoading = true;
  public isFulfilled = false;

  private rowCountAtPage: number = 52; // 1?????????????????? 65??? --(??????)-> ??????55????????????
  private rowTitleRowCount: number = 6; // ?????????????????? 6??????
  private rowTitleRowCount1: number = 4; // ?????????????????? 4??????

  constructor(
    private members: InputMembersService,
    // private durabilityMoment: CalcDurabilityMomentService,
    // private earthquakesMoment: CalcEarthquakesMomentService,
    // private earthquakesShearForce: CalcEarthquakesShearForceService,
    // private restorabilityMoment: CalcRestorabilityMomentService,
    // private restorabilityShearForce: CalcRestorabilityShearForceService,
    // private SafetyFatigueMoment: CalcSafetyFatigueMomentService,
    private safetyFatigueShearForce: CalcSafetyFatigueShearForceService,
    // private safetyMoment: CalcSafetyMomentService,
    // private safetyShearForce: CalcSafetyShearForceService,
    // private serviceabilityMoment: CalcServiceabilityMomentService,
    // private serviceabilityShearForce: CalcServiceabilityShearForceService,
    private safetyTorsionalMoment: CalcSafetyTorsionalMomentService,
    // private serviceabilityTorsionalMoment: CalcServiceabilityTorsionalMomentService,
    // private restorabilityTorsionalMoment: CalcRestorabilityTorsionalMomentService,
    private earthquakesTorsionalMoment: CalcEarthquakesTosionalMomentService
  ) {}

  ngOnInit() {
    this.pages = new Array();

    const groupeList = this.members.getGroupeList();
    for (let i = 0; i < groupeList.length; i++) {
      const memberList = groupeList[i];

      // ????????????????????? ???????????? ??????????????????????????? ??????????????? ????????????
      const g_id: string = memberList[0].g_id;
      let upperSideName: string = "????????? ???";
      let bottomSideName: string = "????????? ???";
      let upperName: string = "??????";
      let bottomName: string = "??????";

      const g_name: string = this.members.getGroupeName(i);

      let page: any = null;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      const g_name_moment: string = g_name + " ??????????????????????????????";
      let tableType: number = 1;
      let currentRow: number = 0;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      const g_name_shear: string = g_name + " ??????????????????????????????";
      tableType = 2;
      currentRow = 0;

      // ?????????????????????????????????????????????????????????
      if (this.safetyFatigueShearForce.DesignForceList.length > 0) {
        const data = [];
        const title = [];
        // ?????????????????????????????????
        data.push(this.safetyFatigueShearForce.DesignForceList);
        title.push("???????????????????????????????????????");
        data.push(this.safetyFatigueShearForce.DesignForceList3);
        title.push("???????????????????????????????????????");
        data.push(this.safetyFatigueShearForce.DesignForceList2);
        title.push("???????????????????????????????????????");

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      if (page !== null) {
        this.pages.push(page);
        page = null;
      }
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      const g_name_tosion: string = g_name + " ??????????????????????????????????????????";
      tableType = 3;
      currentRow = 0;

      // ???????????????????????????????????????????????????????????????
      if (this.safetyTorsionalMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.safetyTorsionalMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            "?????????????????????"
          );
        }
      }

      // ??????????????????????????????????????????????????????????????????
      if (this.earthquakesTorsionalMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.earthquakesTorsionalMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            "????????????????????????"
          );
        }
      }

      if (page !== null) {
        this.pages.push(page);
        page = null;
      }
    }

    this.isLoading = false;
    this.isFulfilled = true;
  }

  private setTables(
    rows: any[],
    page: any,
    g_name: string,
    upperSideName: string,
    bottomSideName: string,
    tableType: number,
    title: string
  ): any {
    if (page === null) {
      page = {
        g_name: g_name,
        tables: new Array(),
        tableType: tableType,
      };
    }
    // ?????????????????????????????????????????????????????????
    if (rows[0] !== null) {
      let y: number = 70;
      y += tableType === 1 ? rows[0].length * 16 : rows[0].length * 32;
      page.tables.push({
        title: title,
        upperSideName: upperSideName,
        bottomSideName: bottomSideName,
        rows: rows[0],
        viewBox: "0 0 568 " + y.toString(),
        height: y.toString(),
      });
    }
    // ??????????????????????????????
    for (let i = 1; i < rows.length; i++) {
      // ??????????????????
      this.pages.push(page);
      page = {
        g_name: g_name,
        tables: new Array(),
        tableType: tableType,
      };
      // ??????????????????????????????
      let y: number = 70;
      y += tableType === 1 ? rows[i].length * 16 : rows[i].length * 32;
      const table: any = {
        title: title,
        upperSideName: upperSideName,
        bottomSideName: bottomSideName,
        rows: rows[i],
        viewBox: "0 0 568 " + y.toString(),
        height: y.toString(),
      };
      page.tables.push(table);
    }
    return page;
  }

  private getTableRowsOfPage(
    targetRows: any[],
    currentRow: number,
    tableType: number
  ): any {
    const result: object = {};
    const tableRowsOfPage: any[] = new Array();
    let rows: any[] = new Array();
    //currentRow += this.rowTitleRowCount;
    currentRow +=
      currentRow === 0 ? this.rowTitleRowCount : this.rowTitleRowCount1;
    const a: number = tableType === 1 ? 1 : 2;
    const RowsCount: number = targetRows.length * a;

    if (currentRow > this.rowTitleRowCount) {
      if (this.rowCountAtPage < currentRow + RowsCount) {
        // ?????????????????????
        if (this.rowTitleRowCount1 + RowsCount < this.rowCountAtPage) {
          // ???????????????????????????
          tableRowsOfPage.push(null);
          tableRowsOfPage.push(targetRows);
          currentRow = this.rowTitleRowCount + RowsCount;
          result["currentRow"] = currentRow;
          result["tableRowsOfPage"] = tableRowsOfPage;
          return result;
        }
      }
    }

    let i: number = currentRow;

    for (const row of targetRows) {
      rows.push(row);
      i += tableType === 1 ? 1 : 2;
      if (this.rowCountAtPage < i) {
        tableRowsOfPage.push(rows);
        rows = new Array();
        i = this.rowTitleRowCount;
      }
    }
    if (i > this.rowTitleRowCount) {
      tableRowsOfPage.push(rows);
    }
    currentRow = i;
    result["currentRow"] = currentRow;
    result["tableRowsOfPage"] = tableRowsOfPage;
    return result;
  }

  private setPage(
    memberList: any[],
    upperName: string,
    bottomName: string,
    forces: any[]
  ): any[] {
    const result = [];
    for (const member of memberList) {
      const tmp = forces.filter((a) => a.m_no === member.m_no);
      if (tmp === undefined) {
        continue;
      }
      for (const pos of tmp) {
        const p: any = {
          m_no: member.m_no,
          p_id: pos.p_id,
          position: pos.position.toFixed(3),
          p_name: pos.p_name,
          upperSideName: upperName,
          bottomSideName: bottomName,
        };

        for (const pp of pos.designForce) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          if ("Md" in pp) {
            if (!isNaN(pp.Md) && pp.Md !== null) {
              md.value = pp.Md.toFixed(2);
              md.position = "right";
            }
          }
          if ("Nd" in pp) {
            if (!isNaN(pp.Nd) && pp.Nd !== null) {
              nd.value = pp.Nd.toFixed(2);
              nd.position = "right";
            }
          }
          if ("Vd" in pp) {
            if (!isNaN(pp.Vd) && pp.Vd !== null) {
              vd.value = pp.Vd.toFixed(2);
              vd.position = "right";
            }
          }
          if ("Mt" in pp) {
            if (!isNaN(pp.Mt) && pp.Mt !== null) {
              mt.value = pp.Mt.toFixed(2);
              mt.position = "right";
            }
          }
          if ("comb" in pp) {
            comb.value = pp.comb;
            comb.position = "center";
          }
          const pt = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
          switch (pp.side) {
            case "????????????":
              p["upper"] = pt;
              break;
            case "????????????":
              p["lower"] = pt;
              break;
          }
        }

        if ("upper" in p === false) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          p["upper"] = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
        }
        if ("lower" in p === false) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          p["lower"] = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
        }

        result.push(p);
      }
    }
    return result;
  }
}
