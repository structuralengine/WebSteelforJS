import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { InputMembersService } from '../members/members.service';

@Injectable({
  providedIn: 'root'
})
export class InputSafetyFactorsMaterialStrengthsService {

  private safety_factor: any;
  private material_bar: any;
  private material_steel: any;
  private material_concrete: any;
  public pile_factor: any;

  constructor(
    private basic: InputBasicInformationService,
    private members: InputMembersService,
    private helper: DataHelperModule) {
    this.clear();
  }
  public clear(): void {
    this.safety_factor = {};
    this.material_bar = {};
    this.material_steel = {};
    this.material_concrete = {};
    this.pile_factor = {};
  }

  // 材料強度情報
  /// specification1_selected によって変わる項目の設定
  public default_safety_factor(): any {

    let result: any;
    const sp1 = this.basic.get_specification1();
    switch (sp1) {
      case 0: // 鉄道
      case 1: // 土木学会

        result = [
          /* {
            id: 0, title: '耐久性, 使用性',
            M_rc: 1.00, M_rs: 1.00, M_rbs: 1.00,
            V_rc: 1.00, V_rs: 1.00, V_rbc: 1.00, V_rbs: 1.00, V_rbv: null,
            T_rbt:1.00,
            ri: 1.00, range: 1,
            S_rs: 1.0, S_rb: 1.0
          }, */
          {
            id: 2, title: '安全性 （疲労破壊）',
            ri: 1.20,  // 安全係数
            rb_T: 1.00, // 引張側鉄骨の材料係数
            rb_C: 1.00, // 圧縮側鉄骨の材料係数
            rb_S: 1.00, // せん断鉄骨の材料係数
            rs: 1.1 // 部材係数
          },
          {
            id: 5, title: '安全性 （破壊）',
            ri: 1.20,  // 安全係数
            rb_T: 1.05, // 引張側鉄骨の材料係数
            rb_C: 1.10, // 圧縮側鉄骨の材料係数
            rb_S: 1.05, // せん断鉄骨の材料係数
            rs: 1.1 // 部材係数
          },
          /* {
            id: 6, title: '復旧性 （損傷）地震時以外',
            M_rc: 1.30, M_rs: 1.00, M_rbs: 1.0,
            V_rc: 1.30, V_rs: 1.00, V_rbc: 1.30, V_rbs: 1.10, V_rbv: 1.20,
            T_rbt:1.00,
            ri: 1.20, range: 3,
            S_rs: 1.05, S_rb: 1.1
          }, */
          {
            id: 7, title: '復旧性 （損傷）地震時',
            ri: 1.00,  // 安全係数
            rb_T: 1.05, // 引張側鉄骨の材料係数
            rb_C: 1.05, // 圧縮側鉄骨の材料係数
            rb_S: 1.05, // せん断鉄骨の材料係数
            rs: 1.1 // 部材係数
          },
          {
            id: 8, title: '最小鉄筋量',
            ri: 1.00,  // 安全係数
            rb_T: 1.05, // 引張側鉄骨の材料係数
            rb_C: 1.05, // 圧縮側鉄骨の材料係数
            rb_S: 1.05, // せん断鉄骨の材料係数
            rs: 1.1 // 部材係数
          }
        ]

        break;

      case 2: // 港湾
        result = new Array();
        break;
    }

    // 例外
    // if(sp1 === 0){
    //   if( this.basic.get_specification2() === 2){
    //     // JR東日本
    //     result[3].r1 = 1.00; // 復旧性の γi =1.00
    //   }
    // }

    return result;

  }

  // 材料強度情報
  public default_material_bar(): any {
    const result = [
      {
        separate: 25,
        tensionBar: { fsy: 345, fsu: 490 },
        sidebar: { fsy: 345, fsu: 490 },
        stirrup: { fsy: 345, fsu: 490 },
        bend: { fsy: 345, fsu: 490 }
      },
      {
        separate: 29,
        tensionBar: { fsy: 345, fsu: 490 },
        sidebar: { fsy: 345, fsu: 490 },
        stirrup: { fsy: 345, fsu: 490 },
        bend: { fsy: 345, fsu: 490 }
      }
    ]
    return result;
  }

  // 材料強度情報
  public default_material_steel(): any {
    const result = [
      {
        separate: 16,
        fsyk: 245,
        fsvyk: 140,
        fsuk: 400,
      },
      {
        separate: 40,
        fsyk: 235,
        fsvyk: 135,
        fsuk: 400,
      },
      {
        separate: 75,
        fsyk: 215,
        fsvyk: 125,
        fsuk: 400,
      }
    ];
    return result;
  }

  public default_material_concrete(): any {
    const result = {
      fck: 24,
      dmax: 25
    };
    return result;
  }

  // 杭の施工係数
  public default_pile_factor(): any {

    let result = [];

    switch (this.basic.get_specification1()) {
      case 0: // 鉄道
      result = [
          { id: 'pile-000', title: '使用しない', rfck: 1.0, rfbok: 1.0, rEc: 1.0, rVcd: 1.0, selected: true },
          { id: 'pile-001', title: '泥水比重1.04以下', rfck: 0.8, rfbok: 0.7, rEc: 0.8, rVcd: 0.9, selected: false },
          { id: 'pile-002', title: '自然泥水, 泥水比重1.10以下', rfck: 0.7, rfbok: 0.6, rEc: 0.8, rVcd: 0.9, selected: false },
          { id: 'pile-003', title: 'ベントナイト泥水', rfck: 0.6, rfbok: 0.5, rEc: 0.7, rVcd: 0.8, selected: false },
          { id: 'pile-004', title: '気中施工', rfck: 0.9, rfbok: 0.9, rEc: 0.9, rVcd: 1.0, selected: false },
        ];
        break;

      case 1: // 土木学会
        result = [
            { id: 'pile-000', title: '使用しない', rfck: 1.0, rfbok: 1.0, rEc: 1.0, rVcd: 1.0, selected: true },
            { id: 'pile-001', title: '泥水比重1.04以下', rfck: 0.8, rfbok: 0.7, rEc: 0.8, rVcd: 0.9, selected: false },
            { id: 'pile-002', title: '自然泥水, 泥水比重1.10以下', rfck: 0.7, rfbok: 0.6, rEc: 0.8, rVcd: 0.9, selected: false },
            { id: 'pile-003', title: 'ベントナイト泥水', rfck: 0.6, rfbok: 0.5, rEc: 0.7, rVcd: 0.8, selected: false },
            { id: 'pile-004', title: '気中施工', rfck: 0.9, rfbok: 0.9, rEc: 0.9, rVcd: 1.0, selected: false },
          ];
          break;
    
      case 2: // 港湾
      result = new Array();

        break;
    }
    return result;
  }

  // component で使う用
  // 部材グループ別に並べている
  public getTableColumns(): any {

    const safety_factor = {};
    const material_bar = {};
    const material_steel = {};
    const material_concrete = {};
    const pile_factor = {};

    // グリッド用データの作成
    const groupe_list = this.members.getGroupeList();
    for( const groupe of groupe_list){
      const first = groupe[0];
      const id = first.g_id;

      // 空のデータを1行追加する
      const tmp_safety_factor = this.default_safety_factor();
      const tmp_material_bar = this.default_material_bar();
      const tmp_material_steel = this.default_material_steel();
      const tmp_material_concrete = this.default_material_concrete();
      const tmp_pile_factor = this.default_pile_factor();

      if (id in this.safety_factor) {
        const old_safety_factor = this.safety_factor[id];
        for (const tmp of tmp_safety_factor) {
          const old = old_safety_factor.find(v => v.id === tmp.id)
          if (old !== undefined) {
            for (const key of Object.keys(tmp)) {
              if (key in old) { 
                tmp[key] = old[key]; 
              } else {
                tmp[key] = null;
              }
            }
          }
        }
      }

      if (id in this.material_bar) {
        const old_material_bar = this.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const old = old_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) { 
              tmp[key] = old[key]; 
            }
          }
        }
      }

      if (id in this.material_steel) {
        const old_material_steel = this.material_steel[id];
        for (let i = 0; i < tmp_material_steel.length; i++) {
          const tmp = tmp_material_steel[i];
          const old = old_material_steel[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) { 
              tmp[key] = old[key];
            }
          }
        }
      }

      if (id in this.material_concrete) {
        const old_material_concrete = this.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in old_material_concrete) {
            tmp_material_concrete[key] = old_material_concrete[key];
          }
        }
      }

      if (id in this.pile_factor) {
        const old_pile_factor = this.pile_factor[id];
        for (let i = 0; i < tmp_pile_factor.length; i++) {
          const tmp = tmp_pile_factor[i];
          const old = old_pile_factor[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) { tmp[key] = old[key]; }
          }
        }
      }
      safety_factor[id] = tmp_safety_factor;
      material_bar[id] = tmp_material_bar
      material_steel[id] = tmp_material_steel;
      material_concrete[id] = tmp_material_concrete;
      pile_factor[id] = tmp_pile_factor;

    }

    return {
      groupe_list,
      safety_factor,
      material_bar,
      material_steel,
      material_concrete,
      pile_factor
    };

  }


  public setTableColumns(safety: any): void {

    this.clear();

    for (const id of Object.keys(safety.safety_factor)) {

      const tmp_safety_factor = this.default_safety_factor();
      const tmp_material_bar = this.default_material_bar();
      const tmp_material_steel = this.default_material_steel();
      const tmp_material_concrete = this.default_material_concrete();
      const tmp_pile_factor = this.default_pile_factor();

      if (id in safety.safety_factor) {
        const new_safety_factor = safety.safety_factor[id];
        for (const tmp of tmp_safety_factor) {
          const org = new_safety_factor.find(v => v.id === tmp.id)
          if (org !== undefined) {
            for (const key of Object.keys(tmp)) {
              if (key in org) { tmp[key] = org[key]; }
            }
          }
        }
      }

      if (id in safety.material_bar) {
        const new_material_bar = safety.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const org = new_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }

      if (id in safety.material_steel) {
        const new_material_steel = safety.material_steel[id];
        for (let i = 0; i < tmp_material_steel.length; i++) {
          const tmp = tmp_material_steel[i];
          const org = new_material_steel[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }

      if (id in safety.material_concrete) {
        const new_material_concrete = safety.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in new_material_concrete) {
            tmp_material_concrete[key] = new_material_concrete[key];
          }
        }
      }

      if (id in safety.pile_factor) {
        const new_pile_factor = safety.pile_factor[id];
        for (let i = 0; i < tmp_pile_factor.length; i++) {
          const tmp = tmp_pile_factor[i];
          const org = new_pile_factor[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }
      this.safety_factor[id] = tmp_safety_factor;
      this.material_bar[id] = tmp_material_bar;
      this.material_steel[id] = tmp_material_steel;
      this.material_concrete[id] = tmp_material_concrete;
      this.pile_factor[id] = tmp_pile_factor;
    }

  }

  // ファイルに書き込む用
  public getSaveData(): any {
    return {
      safety_factor: this.safety_factor,
      material_bar: this.material_bar,
      material_steel: this.material_steel,
      material_concrete: this.material_concrete,
      pile_factor: this.pile_factor
    }
  }

  public setSaveData(safety: any) {
    this.safety_factor = safety.safety_factor,
    this.material_bar = safety.material_bar,
    this.material_steel = safety.material_steel,
    this.material_concrete = safety.material_concrete,
    this.pile_factor = safety.pile_factor
  }

  public getGroupeName(i: number): string {
    return this.members.getGroupeName(i);
  }

  // 計算に必要なデータを返す
  public getCalcData(target: string, g_id: string , safetyID: number): any {

    const result = {};

    // 安全係数 を代入する
    const safety_factor = this.getSafetyFactor(target, g_id, safetyID);
    if(this.helper.toNumber(safety_factor.range)===null){
      safety_factor.range = 3;
    }
    result['safety_factor'] = safety_factor; // 安全係数

    // 鉄筋強度 を代入する
    let bar = this.material_bar[g_id];
    if (bar === undefined) {
      bar = this.default_material_bar();
    }
    result['material_bar'] = bar;

    // コンクリート強度 を代入する
    let conc = this.material_concrete[g_id];
    if (conc === undefined) {
      conc = this.default_material_concrete();
    }
    result['material_concrete'] = conc;

    // 鉄骨強度 を代入する
    let steel = this.material_steel[g_id];
    if (steel === undefined) {
      steel = this.default_material_steel();
    }
    result['material_steel'] = steel;

    // 杭の施工条件
    let pile = this.pile_factor[g_id];
    if (pile === undefined) {
      pile = this.default_pile_factor();
    }
    result['pile_factor'] = pile.find((e) => e.selected === true);


    return result;
  }

  public getSafetyFactor(target: string, g_id: string , safetyID: number): any {

    let safe = this.safety_factor[g_id];
    let current: any;

    if (safe === undefined) {
      safe = this.default_safety_factor();
      current = safe[safetyID];
      for(const key of Object.keys(current)){
        if(key === 'id' || key === 'title') continue;
        current[key] = null;
      }
    } else {
      current = safe[safetyID];
      if(current === undefined){
        const temp = this.default_safety_factor();
        current = temp[safetyID];
      }
    }

    const a = this.default_safety_factor();
    const b = a[safetyID];
    for(const key of Object.keys(b)){
      if(!(key in current) || current[key] ===null || current[key] ===undefined){
        current[key] = b[key];
      }
    }

    const result = {};
    /* if(target === 'Md') {
      // 曲げモーメントの照査の;合
      result['M_rc'] = current.M_rc;
      result['M_rs'] = current.M_rs;
      result['M_rb'] = current.M_rbs;
    }
    if(target === 'Vd') {
        // せん断力の照査の場合
        result['V_rc'] = current.V_rc;
        result['V_rs'] = current.V_rs;
        result['V_rbc'] = current.V_rbc;
        result['V_rbs'] = current.V_rbs;
        result['V_rbd'] = current.V_rbv;
        result['T_rbt'] = current.T_rbt;
    }
    if(target === 'Mt') {
      // ねじり曲げモーメントの照査の;合
      result['M_rc'] = current.M_rc;
      result['M_rs'] = current.M_rs;
      result['M_rb'] = current.M_rbs;
      result['V_rc'] = current.V_rc;
      result['V_rs'] = current.V_rs;
      result['V_rbc'] = current.V_rbc;
      result['V_rbs'] = current.V_rbs;
      result['V_rbd'] = current.V_rbv;
      result['T_rbt'] = current.T_rbt;
    } */

    result['rb_T'] = current.rb_T;
    result['rb_C'] = current.rb_C;
    result['rb_S'] = current.rb_S;
    result['rs'] = current.rs;
    result['ri'] = current.ri;
    result['range'] = current.range;

    return result;
  }

}


