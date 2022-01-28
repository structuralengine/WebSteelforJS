import { SceneService } from '../scene.service';
import { Injectable } from '@angular/core';

import * as THREE from 'three';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { randFloat } from 'three/src/math/MathUtils';

@Injectable({
  providedIn: 'root'
})
export class ThreePanelService {

  private panelList: any[];
 

  private selectionItem: THREE.Object3D;     // 選択中のアイテム

  // 大きさを調整するためのスケール
  private scale: number;
  private params: any;          // GUIの表示制御
  private gui: any;

  constructor(
    private scene: SceneService,
    private http: HttpClient) {

    this.panelList = new Array();

    
    // gui
    this.scale = 1.0;
    this.params = {
      meshScale: this.scale
    };
    this.gui = null;
  }

  public changeData(index: number = 0): void {

    //対象のnodeDataを入手
    const vertexlist = [];
    for (let i=0; i<10; i++) {
        const x = randFloat(0,1);
        const y = randFloat(0,1);
        const z = randFloat(0,1);
        vertexlist.push([x, y, z]);
    }
    this.createPanel(vertexlist)
  }


  // 通常のgeometry(buffergeometryではない)
  private createPanel(vertexlist): void {

    const points = []
    for(const p of vertexlist){
      points.push(new THREE.Vector3(p[0], p[1], p[2]))
    }
    const geometry = new THREE.BufferGeometry().setFromPoints( points )

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      color: 0x7f8F9F,
      opacity: 0.7,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'panel';

    this.panelList.push(mesh);
    this.scene.add(mesh);
  }

  // データをクリアする
  public ClearData(): void {

    for (const mesh of this.panelList) {
      // 文字を削除する
      while (mesh.children.length > 0) {
        const object = mesh.children[0];
        object.parent.remove(object);
      }
      // オブジェクトを削除する
      this.scene.remove(mesh);
    }
    this.panelList = new Array();
  }


}
