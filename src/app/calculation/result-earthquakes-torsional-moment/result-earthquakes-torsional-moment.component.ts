import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcEarthquakesTosionalMomentService } from "./calc-earthquakes-tosional-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { ResultSafetyTorsionalMomentComponent } from '../result-safety-torsional-moment/result-safety-torsional-moment.component';
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { UserInfoService } from "src/app/providers/user-info.service";

@Component({
  selector: 'app-result-earthquakes-torsional-moment',
  templateUrl:
  '../result-safety-torsional-moment/result-safety-torsional-moment.component.html',
styleUrls: ["../result-viewer/result-viewer.component.scss"]
})
export class ResultEarthquakesTorsionalMomentComponent implements OnInit {
  public title: string = "復旧性（地震時）";
  public page_index = "ap_17";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyTorsionalMomentPages: any[];

  constructor(
    private http: HttpClient,
    private calc: CalcEarthquakesTosionalMomentService,
    private result: ResultDataService,
    private post: SetPostDataService,
    private base: ResultSafetyTorsionalMomentComponent,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("earthquakesTorsionalMoment", null);
      return;
    }

    // 計算結果を集計する
    console.log(this.title, postData);
    try {
      // 安全性破壊のページと同じ
      this.safetyTorsionalMomentPages = this.base.getSafetyPages(
        postData,
        "復旧性（地震時）ねじりモーメントの照査結果",
        this.calc.DesignForceList,
        this.calc.safetyID
      );
      this.isFulfilled = true;
      this.calc.isEnable = true;
      this.summary.setSummaryTable("earthquakesTorsionalMoment", this.safetyTorsionalMomentPages);
    } catch (e) {
      this.err = e.toString();
      this.isFulfilled = false;
      this.summary.setSummaryTable("earthquakesTorsionalMoment");
    }
    this.isLoading = false;
  }

}
