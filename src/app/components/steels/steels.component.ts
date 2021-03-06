import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  AfterViewInit,
} from "@angular/core";
import { InputSteelsService } from "./steels.service";
import { SaveDataService } from "src/app/providers/save-data.service";
import { SheetComponent } from "../sheet/sheet.component";
import pq from "pqgrid";
import { ThreePanelService } from "src/app/three/geometry/three-face.service";
import { ThreeService } from "src/app/three/three.service";
import { SceneService } from "src/app/three/scene.service";

@Component({
  selector: "app-steels",
  templateUrl: "./steels.component.html",
  styleUrls: ["./steels.component.scss", "../subNavArea.scss"],
})
export class SteelsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("grid") grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];
  private row: number = 0;

  constructor(
    private steel: InputSteelsService,
    private save: SaveDataService,
    private panel: ThreePanelService,
    private three: ThreeService,
    private scene: SceneService
  ) {}

  ngOnInit() {
    const isManual = this.save.isManual();
    this.setTitle(isManual);

    this.table_datas = this.steel.getTableColumns();

    // グリッドの設定
    this.options = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        width: isManual ? 860 : 980,
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: isManual ? 3 : 4,
        beforeTableView: (evt, ui) => {
          const tb = this.table_datas[i];
          const g_id = tb[0].g_id;
          this.three.selectChange("steels", g_id, this.row);
          this.three.changeData("steels", this.three.currentIndex);
        },
        selectEnd: (evt, ui) => {
          const range = ui.selection.iCells.ranges;
          this.row = range[0].r1;
          const tb = this.table_datas[i];
          const g_id = tb[0].g_id;
          this.three.selectChange("steels", g_id, this.row);
        },
        change: (evt, ui) => {
          this.saveData();
          this.three.changeData("steels", i);
        },
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.steel.getGroupeName(i));
    }

    // 初期表示の描画をする
  }

  ngAfterViewInit() {
    this.activeButtons(0);
    this.scene.render();
  }

  private setTitle(isManual: boolean): void {
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        {
          title: "",
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 60,
          style: { background: "#f5f5f5" },
          styleHead: { background: "#f5f5f5" },
        },
      ];
    } else {
      this.columnHeaders = [
        {
          title: "部材<br/>番号",
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 60,
          style: { background: "#f5f5f5" },
          styleHead: { background: "#f5f5f5" },
        },
        {
          title: "位置",
          dataType: "float",
          format: "#.000",
          dataIndx: "position",
          editable: false,
          frozen: true,
          sortable: false,
          width: 110,
          style: { background: "#f5f5f5" },
          styleHead: { background: "#f5f5f5" },
        },
      ];
    }

    // 共通する項目
    this.columnHeaders.push(
      {
        title: "算出点名",
        dataType: "string",
        dataIndx: "p_name",
        editable: false,
        frozen: true,
        sortable: false,
        width: 250,
        style: { background: "#f5f5f5" },
        styleHead: { background: "#f5f5f5" },
      },
      {
        title: "位置",
        align: "center",
        dataType: "string",
        dataIndx: "design_point_id",
        frozen: true,
        editable: true,
        sortable: false,
        width: 40,
        style: { background: "#f5f5f5" },
        styleHead: { background: "#f5f5f5" },
      },
      {
        title: "フランジ/ウェブ長",
        align: "center",
        colModel: [
          {
            title: "b",
            dataType: "float",
            dataIndx: "steel_b",
            sortable: false,
            width: 70,
          },
          {
            title: "h",
            dataType: "float",
            dataIndx: "steel_h",
            sortable: false,
            width: 70,
          },
          {
            title: "w",
            dataType: "float",
            dataIndx: "steel_w",
            sortable: false,
            width: 70,
          },
          /* {
        title: "w2",
        dataType: "float",
        dataIndx: "steel_w2",
        sortable: false,
        width: 70,
      } */
        ],
      },
      {
        title: "リブ長",
        align: "center",
        colModel: [
          {
            title: "b",
            dataType: "float",
            dataIndx: "lib_b",
            sortable: false,
            width: 70,
          },
          {
            title: "h",
            dataType: "float",
            dataIndx: "lib_h",
            sortable: false,
            width: 70,
          },
          {
            title: "w",
            dataType: "float",
            dataIndx: "lib_w",
            sortable: false,
            width: 70,
          },
          {
            title: "n",
            dataType: "integer",
            dataIndx: "lib_n",
            sortable: false,
            width: 70,
          },
          /* {
        title: "w2",
        dataType: "float",
        dataIndx: "steel_w2",
        sortable: false,
        width: 70,
      } */
        ],
      }
    );
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
  }
  public saveData(): void {
    const a = [];
    for (const g of this.table_datas) {
      for (const e of g) {
        a.push(e);
      }
    }
    this.steel.setTableColumns(a);
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 100;
    return containerHeight;
  }

  public activePageChenge(id: number): void {
    this.activeButtons(id);

    this.options = this.option_list[id];
    this.grid.options = this.options;
    this.grid.refreshDataAndView();

    this.row = 0;
    this.three.currentIndex = id + 1;
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("stl" + i);
      if (data != null) {
        if (i === id) {
          data.classList.add("is-active");
        } else if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
  }
}
