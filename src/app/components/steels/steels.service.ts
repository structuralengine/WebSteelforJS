import { Injectable } from "@angular/core";
import { DataHelperModule } from "../../providers/data-helper.module";
import { InputBarsService } from "../bars/bars.service";
import { InputDesignPointsService } from "../design-points/design-points.service";

@Injectable({
  providedIn: "root",
})
export class InputSteelsService {
  // 鉄筋情報
  private steel_list: any[];
  // private table_datas: any[];

  constructor(
    private points: InputDesignPointsService,
    private bars: InputBarsService,
    private helper: DataHelperModule
  ) {
    this.clear();
  }
  public clear(): void {
    this.steel_list = new Array();
  }

  // 鉄筋情報
  private default_steels(id: number): any {
    return {
      m_no: null,
      index: id,
      position: null,
      p_name: null,
      1: this.default_steel("1"),
      2: this.default_steel("2"),
      3: this.default_steel("3"),
      4: this.default_steel("4"),
      5: this.default_steel("5"),
    };
  }

  private default_steel(title: string): any {
    return {
      title: title,
      steel_b: null,
      steel_h: null,
      steel_w: null,
      // steel_w1: null,
      // steel_w2: null,
      lib_b: null,
      lib_h: null,
      lib_w: null,
      lib_n: null,
    };
  }
  // private default_I_steel(): any {
  //   return {
  //     title: "I",
  //     upper_cover: null,
  //     upper_width: null,
  //     upper_thickness: null,
  //     web_thickness: null,
  //     web_height: null,
  //     lower_width: null,
  //     lower_thickness: null,
  //   };
  // }

  // private default_H_steel(): any {
  //   return {
  //     title: "H",
  //     left_cover: null,
  //     left_width: null,
  //     left_thickness: null,
  //     web_thickness: null,
  //     web_height: null,
  //     right_width: null,
  //     right_thickness: null,
  //   };
  // }

  public getTableColumns(): any[] {
    // 一旦teble_datasをprivateでおいてみる
    //const table_datas: any[] = new Array();
    const table_datas = new Array();

    const groupe_list = this.points.getGroupeList();
    for (let i = 0; i < groupe_list.length; i++) {
      const table_groupe = [];
      // 部材
      for (const member of groupe_list[i]) {
        // 着目点
        let count = 0;
        for (let k = 0; k < member.positions.length; k++) {
          const pos = member.positions[k];
          if (!this.points.isEnable(pos)) {
            continue;
          }
          const data: any = this.getTableColumn(pos.index);
          // const bar: any = this.bars.getTableColumn(pos.index);
          data.m_no = member.m_no;
          data.shape = member.shape;
          data["g_id"] = member.g_id;
          data.position = pos.position;

          // データを2行に分ける
          const column1 = {};
          const column2 = {};
          const column3 = {};
          const column4 = {};
          const column5 = {};
          column1["m_no"] = count === 0 ? member.m_no : ""; // 最初の行には 部材番号を表示する
          column1["shape"] = member.shape = "" ? "I型" : member.shape;
          // 1行目
          column1["index"] = data["index"];
          const a: number = this.helper.toNumber(data.position);
          column1["position"] = a === null ? "" : a.toFixed(3);
          column1["p_name"] = data["p_name"];
          column1["g_id"] = data["g_id"];
          column1["design_point_id"] = data["1"].title;
          column1["steel_b"] = data["1"].steel_b;
          column1["steel_h"] = data["1"].steel_h;
          column1["steel_w"] = data["1"].steel_w;
          column1["lib_b"] = data["1"].lib_b;
          column1["lib_h"] = data["1"].lib_h;
          column1["lib_w"] = data["1"].lib_w;
          column1["lib_n"] = data["1"].lib_n;
          // column1["steel_w2"] = data["1"].steel_w2;

          table_groupe.push(column1);

          // 2行目
          column2["design_point_id"] = data["2"].title;
          column2["steel_b"] = data["2"].steel_b;
          column2["steel_h"] = data["2"].steel_h;
          column2["steel_w"] = data["2"].steel_w;
          column2["lib_b"] = data["2"].lib_b;
          column2["lib_h"] = data["2"].lib_h;
          column2["lib_w"] = data["2"].lib_w;
          column2["lib_n"] = data["2"].lib_n;
          // column2["steel_w2"] = data["2"].steel_w2;
          table_groupe.push(column2);

          // 3行目
          column3["design_point_id"] = data["3"].title;
          column3["steel_b"] = data["3"].steel_b;
          column3["steel_h"] = data["3"].steel_h;
          column3["steel_w"] = data["3"].steel_w;
          column3["lib_b"] = data["3"].lib_b;
          column3["lib_h"] = data["3"].lib_h;
          column3["lib_w"] = data["3"].lib_w;
          column3["lib_n"] = data["3"].lib_n;
          // column3["steel_w2"] = data["3"].steel_w2;
          table_groupe.push(column3);

          // 4行目
          column4["design_point_id"] = data["4"].title;
          column4["steel_b"] = data["4"].steel_b;
          column4["steel_h"] = data["4"].steel_h;
          column4["steel_w"] = data["4"].steel_w;
          column4["lib_b"] = data["4"].lib_b;
          column4["lib_h"] = data["4"].lib_h;
          column4["lib_w"] = data["4"].lib_w;
          column4["lib_n"] = data["4"].lib_n;
          // column4["steel_w2"] = data["4"].steel_w2;
          table_groupe.push(column4);

          // 5行目
          column5["design_point_id"] = data["5"].title;
          column5["steel_b"] = data["5"].steel_b;
          column5["steel_h"] = data["5"].steel_h;
          column5["steel_w"] = data["5"].steel_w;
          column5["lib_b"] = data["5"].lib_b;
          column5["lib_h"] = data["5"].lib_h;
          column5["lib_w"] = data["5"].lib_w;
          column5["lib_n"] = data["5"].lib_n;

          // column5["steel_w2"] = data["5"].steel_w2;
          table_groupe.push(column5);
          count++;
        }
      }
      table_datas.push(table_groupe);
    }
    return table_datas;
  }

  public getTableColumn(index: any): any {
    let result = this.steel_list.find((value) => value.index === index);
    if (result === undefined) {
      result = this.default_steels(index);
      this.steel_list.push(result);
    }
    return result;
  }

  public getCalcData(index: any): any {
    let result = null;

    const steel_list = JSON.parse(
      JSON.stringify({
        temp: this.steel_list,
      })
    ).temp;

    const positions = this.points.getSameGroupePoints(index);
    const start = positions.findIndex((v) => v.index === index);

    for (let ip = start; ip >= 0; ip--) {
      const pos = positions[ip];
      if (!this.points.isEnable(pos)) {
        continue; // 計算対象ではなければスキップ
      }
      // barデータに（部材、着目点など）足りない情報を追加する
      const data: any = steel_list.find((v) => v.index === pos.index);
      if (data === undefined) {
        continue;
      }
      if (result === null) {
        // 当該入力行 の情報を入手
        result = this.default_steels(index);
        for (const key of Object.keys(result)) {
          // if (["I", "H"].includes(key)) {
          //   for (const k of Object.keys(result[key])) {
          //     if (k in data[key]) {
          //       result[key][k] = data[key][k];
          //     }
          //   }
          // } else {
          result[key] = data[key];
          // }
        }
      }
      // 当該入力行より上の行
      // let endFlg = true;
      // for (const key of ["I", "H"]) {
      //   const resteel = data[key];
      //   const re = result[key];
      //   for (const k of Object.keys(re)) {
      //     if (re[k] === null && k in resteel) {
      //       re[k] = this.helper.toNumber(resteel[k]);
      //       endFlg = false; // まだ終わらない
      //     }
      //   }
      // }
      // if (endFlg === true) {
      //   // 全ての値に有効な数値(null以外)が格納されたら終了する
      //   break;
      // }
    }

    return result;
  }

  public setTableColumns(table_datas: any[]) {
    this.steel_list = new Array();

    for (let i = 0; i < table_datas.length; i += 5) {
      const column1 = table_datas[i];
      const column2 = table_datas[i + 1];
      const column3 = table_datas[i + 2];
      const column4 = table_datas[i + 3];
      const column5 = table_datas[i + 4];

      const b = this.default_steels(column1.index);
      b.m_no = column1.m_no;
      b.position = column1.position;
      b.p_name = column1.p_name;

      b["1"].title = column1.design_point_id;
      b["1"].steel_b = column1.steel_b;
      b["1"].steel_h = column1.steel_h;
      b["1"].steel_w = column1.steel_w;
      b["1"].lib_b = column1.lib_b;
      b["1"].lib_h = column1.lib_h;
      b["1"].lib_w = column1.lib_w;
      b["1"].lib_n = column1.lib_n;
      // b["1"].steel_w2 = column1.steel_w2;

      b["2"].title = column2.design_point_id;
      b["2"].steel_b = column2.steel_b;
      b["2"].steel_h = column2.steel_h;
      b["2"].steel_w = column2.steel_w;
      b["2"].lib_b = column2.lib_b;
      b["2"].lib_h = column2.lib_h;
      b["2"].lib_w = column2.lib_w;
      b["2"].lib_n = column2.lib_n;
      // b["2"].steel_w2 = column2.steel_w2;

      b["3"].title = column3.design_point_id;
      b["3"].steel_b = column3.steel_b;
      b["3"].steel_h = column3.steel_h;
      b["3"].steel_w = column3.steel_w;
      b["3"].lib_b = column3.lib_b;
      b["3"].lib_h = column3.lib_h;
      b["3"].lib_w = column3.lib_w;
      b["3"].lib_n = column3.lib_n;
      // b["3"].steel_w2 = column3.steel_w2;

      b["4"].title = column4.design_point_id;
      b["4"].steel_b = column4.steel_b;
      b["4"].steel_h = column4.steel_h;
      b["4"].steel_w = column4.steel_w;
      b["4"].lib_b = column4.lib_b;
      b["4"].lib_h = column4.lib_h;
      b["4"].lib_w = column4.lib_w;
      b["4"].lib_n = column4.lib_n;
      // b["4"].steel_w2 = column4.steel_w2;

      b["5"].title = column5.design_point_id;
      b["5"].steel_b = column5.steel_b;
      b["5"].steel_h = column5.steel_h;
      b["5"].steel_w = column5.steel_w;
      b["5"].lib_b = column5.lib_b;
      b["5"].lib_h = column5.lib_h;
      b["5"].lib_w = column5.lib_w;
      b["5"].lib_n = column5.lib_n;
      // b["5"].steel_w2 = column5.steel_w2;

      this.steel_list.push(b);
    }
  }

  public setPickUpData() {}

  public getSaveData(): any[] {
    return this.steel_list;
  }

  public setSaveData(steel: any) {
    this.steel_list = steel;
  }

  public getGroupeName(i: number): string {
    return this.points.getGroupeName(i);
  }

  // 入力情報を得る関数, pegeが一致するのを全部回収
  public getSteelJson(index) {
    const grouping_datas = this.getTableColumns();
    let memory = {};
    // 入力が省略されていたら上の行
    let count = 5;
    for (const page of Object.keys(grouping_datas)) {
      const data_list = grouping_datas[page];
      for (let i = 0; i < data_list.length; i++) {
        if (!("index" in data_list[i])) continue;
        // いずれ、ここで分岐する
        if (data_list[i]["shape"] === "箱形/π形") {
          count = 5;
        } else if (data_list[i]["shape"] === "鋼管") {
          count = 5;
        }
        const steelKeys = [
          "steel_b",
          "steel_h",
          "steel_w",
          "lib_b",
          "lib_h",
          "lib_w",
          "lib_n",
        ];
        let flag: boolean = true;
        Loops: for (let n = 0; n < count; n++) {
          const row = data_list[i + n];
          for (const key of steelKeys) {
            if (row[key] != undefined) {
              flag = false;
              break Loops;
            }
          }
        }
        // 該当のデータが無ければtrue, あればfalse
        if (flag) {
          // 上の行(memory)を代入
          if (Object.keys(memory).length === 0) continue;
          for (const nKey of Object.keys(memory)) {
            const n = this.helper.toNumber(nKey);
            const steelKeys = [
              "steel_b",
              "steel_h",
              "steel_w",
              "lib_b",
              "lib_h",
              "lib_w",
              "lib_n",
            ];
            for (const key of steelKeys) {
              data_list[i + n][key] = memory[n][key];
            }
          }
        } else {
          // memory（上の行）に保存
          for (let n = 0; n < count; n++) {
            memory[n] = data_list[i + n];
          }
        }
      }
    }
    let result: any[];
    for (const datas of grouping_datas) {
      const g_id = datas[0]["g_id"];
      if (g_id == index) {
        result = datas;
        break;
      }
    }
    return result;
  }
}
