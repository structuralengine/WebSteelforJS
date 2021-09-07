﻿import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

import { InputCalclationPrintService } from '../../components/calculation-print/calculation-print.service';
import { CalcDurabilityMomentService } from '../result-durability-moment/calc-durability-moment.service';
import { CalcEarthquakesMomentService } from '../result-earthquakes-moment/calc-earthquakes-moment.service';
import { CalcEarthquakesShearForceService } from '../result-earthquakes-shear-force/calc-earthquakes-shear-force.service';
import { CalcRestorabilityMomentService } from '../result-restorability-moment/calc-restorability-moment.service';
import { CalcRestorabilityShearForceService } from '../result-restorability-shear-force/calc-restorability-shear-force.service';
import { CalcSafetyFatigueMomentService } from '../result-safety-fatigue-moment/calc-safety-fatigue-moment.service';
import { CalcSafetyFatigueShearForceService } from '../result-safety-fatigue-shear-force/calc-safety-fatigue-shear-force.service';
import { CalcSafetyMomentService } from '../result-safety-moment/calc-safety-moment.service';
import { CalcSafetyShearForceService } from '../result-safety-shear-force/calc-safety-shear-force.service';
import { CalcServiceabilityMomentService } from '../result-serviceability-moment/calc-serviceability-moment.service';
import { CalcServiceabilityShearForceService } from '../result-serviceability-shear-force/calc-serviceability-shear-force.service';
import { CalcMinimumReinforcementService } from '../result-minimum-reinforcement/calc-minimum-reinforcement.service'

import { CalcSummaryTableService } from '../result-summary-table/calc-summary-table.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResultSummaryTableComponent } from '../result-summary-table/result-summary-table.component';
import { UserInfoService } from 'src/app/providers/user-info.service';


@Component({
  selector: 'app-result-viewer',
  templateUrl: './result-viewer.component.html',
  styleUrls: ['./result-viewer.component.scss']
})
export class ResultViewerComponent implements OnInit {

  // 目次 /////////////////////////////////
  public printcalculate: boolean;
  public printSectionForce: boolean;
  public _printSummaryTable: boolean;
  
  // 印刷時のスタイル /////////////////////////////////
 
  constructor(
    private modalService: NgbModal,
    public summary: CalcSummaryTableService,
    private printControl: InputCalclationPrintService,
    public durabilityMoment: CalcDurabilityMomentService,
    public earthquakesMoment: CalcEarthquakesMomentService,
    public earthquakesShearForce: CalcEarthquakesShearForceService,
    public restorabilityMoment: CalcRestorabilityMomentService,
    public restorabilityShearForce: CalcRestorabilityShearForceService,
    public SafetyFatigueMoment: CalcSafetyFatigueMomentService,
    public safetyFatigueShearForce: CalcSafetyFatigueShearForceService,
    public safetyMoment: CalcSafetyMomentService,
    public safetyShearForce: CalcSafetyShearForceService,
    public serviceabilityMoment: CalcServiceabilityMomentService,
    public serviceabilityShearForce: CalcServiceabilityShearForceService,
    public ResultMinimumReinforcement: CalcMinimumReinforcementService,
    private user: UserInfoService
  ) { }

  ngOnInit() {

    this.printSectionForce = this.printControl.print_selected.print_section_force_checked;

    this.printcalculate = false;
    if (this.printControl.print_selected.print_calculate_checked === true) {
        this.printcalculate = true;
    }

    this.durabilityMoment.setDesignForces();
    this.earthquakesMoment.setDesignForces();
    this.earthquakesShearForce.setDesignForces();
    this.restorabilityMoment.setDesignForces();
    this.restorabilityShearForce.setDesignForces();
    this.SafetyFatigueMoment.setDesignForces();
    this.safetyFatigueShearForce.setDesignForces();
    this.safetyMoment.setDesignForces();
    this.safetyShearForce.setDesignForces();
    this.serviceabilityMoment.setDesignForces();
    this.serviceabilityShearForce.setDesignForces();
    this.ResultMinimumReinforcement.setDesignForces();

    this.summary.clear();
    this._printSummaryTable = false;
  }

  // 総括表の準備ができたか判定する関数
  public printSummaryTable(): boolean {
    if(!this._printSummaryTable){
      if( this.summary.checkDone() === true){
        alert(this.user.deduct_points + 'ポイント消費しました。本日の使用量は、'+  this.user.daily_points + 'です.');
        this._printSummaryTable = true;
      }
    }
    return this._printSummaryTable;
  }

  // 総括表を表示する関数
  public summaryTableShow() {
    this.modalService.open(ResultSummaryTableComponent, 
      { size: 'xl', scrollable: false });
  }

}