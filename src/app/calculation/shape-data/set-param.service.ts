import { Injectable } from "@angular/core";
import { Vector3 } from "three";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class SetParamService {
  constructor() {}

  // 重心位置を入手
  public getCentroid(vertices): Vector3 {
    let Ax: number = 0;
    let Ay: number = 0;
    let Az: number = 0;
    let A: number = 0;
    for (const num of Object.keys(vertices)) {
      const vertice = vertices[num].vertice;
      const position = vertices[num].position;
      // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
      const abacad = this.getAbAcAd(vertice);
      const ab = abacad.ab;
      const ac = abacad.ac;
      const ad = abacad.ad;
      // 面積が0になるのでreturn
      if (
        ab.x === 0 &&
        ab.y === 0 &&
        ab.z === 0 &&
        ac.x === 0 &&
        ac.y === 0 &&
        ac.z === 0 &&
        ad.x === 0 &&
        ad.y === 0 &&
        ad.z === 0
      ) {
        return new Vector3(0, 0, 0);
      }
      // meshの三角形Aの重心（centroid1）と、面積（area1）をベクトルから算出
      const centroid1 = new Vector3(
        (0 + ab.x + ac.x) / 3 + vertice[0].x,
        (0 + ab.y + ac.y) / 3 + vertice[0].y,
        (0 + ab.z + ac.z) / 3 + vertice[0].z
      );
      const area1: number =
        ((ab.y * ac.z - ab.z * ac.y) ** 2 +
          (ab.z * ac.x - ab.x * ac.z) ** 2 +
          (ab.x * ac.y - ab.y * ac.x) ** 2) **
          0.5 /
        2;
      // meshの三角形Bの重心（centroid2）と、面積（area2）をベクトルから算出
      const centroid2 = new Vector3(
        (0 + ac.x + ad.x) / 3 + vertice[0].x,
        (0 + ac.y + ad.y) / 3 + vertice[0].y,
        (0 + ac.z + ad.z) / 3 + vertice[0].z
      );
      const area2: number =
        ((ac.y * ad.z - ac.z * ad.y) ** 2 +
          (ac.z * ad.x - ac.x * ad.z) ** 2 +
          (ac.x * ad.y - ac.y * ad.x) ** 2) **
          0.5 /
        2;
      // 2つの三角形から, 四角形の重心（centroid0）と面積（area0）を算出し加算する
      const area0 = area1 + area2;
      Ax +=
        ((centroid1.x * area1 + centroid2.x * area2) / area0 + position.x) *
        area0;
      Ay +=
        ((centroid1.y * area1 + centroid2.y * area2) / area0 + position.y) *
        area0;
      Az +=
        ((centroid1.z * area1 + centroid2.z * area2) / area0 + position.z) *
        area0;
      A += area0;
    }
    const centroid = new Vector3(Ax / A, Ay / A, Az / A);

    return centroid;
  }

  // 断面情報の算出(A, Ix, Iy)
  public getSectionParam(vertices, centroid = null) {
    if (centroid === null) {
      centroid = this.getCentroid(vertices);
    }
    let A: number = 0;
    let Ix: number = 0;
    let Iy: number = 0;
    for (const steel of vertices) {
      const vertice = steel.vertice;
      const position = steel.position;
      const abacad = this.getAbAcAd(vertice);
      const ab = abacad.ab;
      const ac = abacad.ac;
      const ad = abacad.ad;
      // 面積が0になるのでreturn
      if (
        ab.x === 0 &&
        ab.y === 0 &&
        ab.z === 0 &&
        ac.x === 0 &&
        ac.y === 0 &&
        ac.z === 0 &&
        ad.x === 0 &&
        ad.y === 0 &&
        ad.z === 0
      ) {
        return { A, Ix, Iy };
      }
      // meshの三角形Aの重心（centroid1）と、面積（area1）をベクトルから算出
      const centroid1 = new Vector3(
        (0 + ab.x + ac.x) / 3 + vertice[0].x,
        (0 + ab.y + ac.y) / 3 + vertice[0].y,
        (0 + ab.z + ac.z) / 3 + vertice[0].z
      );
      const area1: number =
        ((ab.y * ac.z - ab.z * ac.y) ** 2 +
          (ab.z * ac.x - ab.x * ac.z) ** 2 +
          (ab.x * ac.y - ab.y * ac.x) ** 2) **
          0.5 /
        2;
      // meshの三角形Bの重心（centroid2）と、面積（area2）をベクトルから算出
      const centroid2 = new Vector3(
        (0 + ac.x + ad.x) / 3 + vertice[0].x,
        (0 + ac.y + ad.y) / 3 + vertice[0].y,
        (0 + ac.z + ad.z) / 3 + vertice[0].z
      );
      const area2: number =
        ((ac.y * ad.z - ac.z * ad.y) ** 2 +
          (ac.z * ad.x - ac.x * ad.z) ** 2 +
          (ac.x * ad.y - ac.y * ad.x) ** 2) **
          0.5 /
        2;
      // 断面二次モーメント(Ix0, Iy0, Ax^2, Ay^2)を算出
      const nodes = [new Vector3(0, 0, 0), ab, ac, ad];
      const Ix0 = this.getI0(nodes, "x");
      const Iy0 = this.getI0(nodes, "y");
      const Centroid_rect = new Vector3(
        (area1 * centroid1.x + area2 * centroid2.x) / (area1 + area2),
        (area1 * centroid1.y + area2 * centroid2.y) / (area1 + area2),
        (area1 * centroid1.z + area2 * centroid2.z) / (area1 + area2)
      );
      const Ax2 =
        (area1 + area2) * (centroid.y - (position.y + Centroid_rect.y)) ** 2;
      const Ay2 =
        (area1 + area2) * (centroid.x - (position.x + Centroid_rect.x)) ** 2;
      // 情報を加算する
      A += area1 + area2;
      Ix += Ix0 + Ax2;
      Iy += Iy0 + Ay2;
    }
    return { A, Ix, Iy };
  }

  // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
  public getAbAcAd(vertice) {
    const ab = new Vector3(
      vertice[1].x - vertice[0].x,
      vertice[1].y - vertice[0].y,
      vertice[1].z - vertice[0].z
    );
    const ac = new Vector3(
      vertice[2].x - vertice[0].x,
      vertice[2].y - vertice[0].y,
      vertice[2].z - vertice[0].z
    );
    const ad = new Vector3(
      vertice[3].x - vertice[0].x,
      vertice[3].y - vertice[0].y,
      vertice[3].z - vertice[0].z
    );
    return { ab, ac, ad };
  }

  // 任意四角形の断面二次モーメント
  private getI0(nodes, key: string = "x"): number {
    let I = 0;
    // 最初に、全ての点を第一象限に格納する
    const min_x = Math.min(nodes[0].x, nodes[1].x, nodes[2].x, nodes[3].x);
    const min_y = Math.min(nodes[0].y, nodes[1].y, nodes[2].y, nodes[3].y);
    // x, yはここで分岐
    const newNodes = [];
    if (key === "x") {
      newNodes.push(
        new Vector3(nodes[0].x - min_x, nodes[0].y - min_y, nodes[0].z)
      );
      newNodes.push(
        new Vector3(nodes[1].x - min_x, nodes[1].y - min_y, nodes[1].z)
      );
      newNodes.push(
        new Vector3(nodes[2].x - min_x, nodes[2].y - min_y, nodes[2].z)
      );
      newNodes.push(
        new Vector3(nodes[3].x - min_x, nodes[3].y - min_y, nodes[3].z)
      );
      newNodes.push(
        new Vector3(nodes[0].x - min_x, nodes[0].y - min_y, nodes[0].z)
      );
    } else {
      newNodes.push(
        new Vector3(nodes[0].y - min_y, nodes[0].x - min_x, nodes[0].z)
      );
      newNodes.push(
        new Vector3(nodes[1].y - min_y, nodes[1].x - min_x, nodes[1].z)
      );
      newNodes.push(
        new Vector3(nodes[2].y - min_y, nodes[2].x - min_x, nodes[2].z)
      );
      newNodes.push(
        new Vector3(nodes[3].y - min_y, nodes[3].x - min_x, nodes[3].z)
      );
      newNodes.push(
        new Vector3(nodes[0].y - min_y, nodes[0].x - min_x, nodes[0].z)
      );
    }
    const X1X2X0ab = [];
    for (let n = 0; n < newNodes.length - 1; n++) {
      X1X2X0ab[n] = {};
      X1X2X0ab[n]["x1"] = newNodes[n].x;
      X1X2X0ab[n]["x2"] = newNodes[n + 1].x;
      // 2点が軸に垂直
      if (newNodes[n].x - newNodes[n + 1].x === 0) {
        X1X2X0ab[n]["a"] = 0;
        X1X2X0ab[n]["b"] = 0;
        X1X2X0ab[n]["x0"] = 0;
        // 2点が軸に垂直でなく、傾きを持つ
      } else {
        const a =
          (newNodes[n].y - newNodes[n + 1].y) /
          (newNodes[n].x - newNodes[n + 1].x);
        const b = newNodes[n].y - a * newNodes[n].x;
        X1X2X0ab[n]["a"] = a;
        X1X2X0ab[n]["b"] = b;
        X1X2X0ab[n]["x0"] = a === 0 ? 0 : (-1 * b) / a;
      }
    }
    for (const line of X1X2X0ab) {
      const x1 = line.x1;
      const x2 = line.x2;
      const x0 = line.x0;
      const a = line.a;
      const b = line.b;

      if (a === 0) {
        I += (b ** 3 * (x2 - x1)) / 12;
      } else {
        I +=
          ((x2 - x0) * (a * x2 + b) ** 3 - (x1 - x0) * (a * x1 + b) ** 3) / 36;
      }
    }

    return Math.abs(I);
  }

  public getVertices_fixed(section, lambda_1, key = 'x'): any[] {
    const result = []; // 出力される頂点情報群
    const vertices = section.steels.vertices;
    // const lambda1 = lambda[0];
    // const lambda2 = lambda[1];
    // const lambda11 = lambda[2];
    const lambda1 = lambda_1.x['lambda1'];
    const lambda2 = lambda_1.x['lambda2'];
    const lambda3 = lambda_1.x['lambda3'];
    const lambda4 = lambda_1.x['lambda4'];
    const lambda5 = lambda_1.x['lambda5'];
    const lambda6 = lambda_1.x['lambda6'];
    const lambda7 = lambda_1.x['lambda7'];
    const lambda8 = lambda_1.x['lambda8'];
    const lambda11 = lambda_1.y['lambda1'];
    let vertice1;
    let vertice2;
    let vertice3;
    let vertice4;
    let vertice5;
    let position1;
    let position2;
    let position3;
    let position4;
    let position5;
    let w1;
    let w2;
    let w3;
    let w4;
    let w5;
    // let child = {};
    let shita: number;
    let dx: number;
    let dy: number;
    // for ( let n = 0; n < vertices.length; n++ ) {
    switch (section.shapeName) {
      case ('I'):
        vertice1 = vertices[0].vertice;
        vertice2 = vertices[1].vertice;
        vertice3 = vertices[2].vertice;
        position1 = vertices[0].position;
        position2 = vertices[1].position;
        position3 = vertices[2].position;
        w1 = section.steels[0 + 1].steel_w;
        w2 = section.steels[1 + 1].steel_w;
        w3 = section.steels[2 + 1].steel_w;
        // 1部材について -> 2つに分解する        
        shita = Math.atan((vertice1[1].y - vertice1[0].y) / (vertice1[1].x - vertice1[0].x));  // 0
        dx = lambda1 * Math.cos(shita); // 100
        dy = lambda1 * Math.sin(shita); // 0
        const child11 = {};
        child11['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice1[2].y + dy, 0),
                              new Vector3(0, vertice1[2].y + dy, 0),
                            ];
        child11['position'] = new Vector3(position1.x + w1 - dx, position1.y, position1.z);
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0)
                                ],
                      'position': new Vector3(position1.x + w1 - dx, position1.y, position1.z)
                    }); // 1部材の1つ目
        dx = lambda4 * Math.cos(shita); // 100
        dy = lambda4 * Math.sin(shita); // 0
        /* const child12 = {};
        child12['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice1[2].y + dy, 0),
                              new Vector3(0, vertice1[2].y + dy, 0),
                            ];
        child12['position'] = new Vector3(position1.x + w1, position1.y, position1.z) */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0),
                                ],
                      'position': new Vector3(position1.x + w1, position1.y, position1.z)
                    }); // 1部材の2つ目
        // 2部材
        result.push(vertices[1]); // 2部材の1つ目

        // 3部材
        shita = Math.atan((vertice3[1].y - vertice3[0].y) / (vertice3[1].x - vertice3[0].x));  // 0
        dx = lambda5 * Math.cos(shita); // 100
        dy = lambda5 * Math.sin(shita); // 0
        /* const child13 = {};
        child13['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice3[2].y + dy, 0),
                              new Vector3(0, vertice3[2].y + dy, 0),
                            ];
        child13['position'] = new Vector3(position3.x + w3 - dx, position3.y, position3.z)
        result.push(child13); // 3部材の1つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice3[2].y + dy, 0),
                                  new Vector3(0, vertice3[2].y + dy, 0),
                                ],
                      'position': new Vector3(position3.x + w3 - dx, position3.y, position3.z)
                    }); // 3部材の1つ目
        dx = lambda8 * Math.cos(shita); // 100
        dy = lambda8 * Math.sin(shita); // 0
        /* const child14 = {};
        child14['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice3[2].y + dy, 0),
                              new Vector3(0, vertice3[2].y + dy, 0),
                            ],
        child14['position'] = new Vector3(position3.x + w3, position3.y, position3.z)
        result.push(child14); // 3部材の2つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice3[2].y + dy, 0),
                                  new Vector3(0, vertice3[2].y + dy, 0),
                                ],
                      'position': new Vector3(position3.x + w3, position3.y, position3.z)
                    }); // 3部材の2つ目

        break;

      case ('H'):

        break;

      case ('Box'):
        vertice1 = vertices[0].vertice;
        vertice2 = vertices[1].vertice;
        vertice3 = vertices[2].vertice;
        vertice4 = vertices[3].vertice;
        position1 = vertices[0].position;
        position2 = vertices[1].position;
        position3 = vertices[2].position;
        position4 = vertices[3].position;
        w1 = section.steels[0 + 1].steel_w;
        w2 = section.steels[1 + 1].steel_w;
        w3 = section.steels[2 + 1].steel_w;
        w4 = section.steels[3 + 1].steel_w;
        // 1部材について -> 4つに分解する
        shita = Math.atan((vertice1[1].y - vertice1[0].y) / (vertice1[1].x - vertice1[0].x));  // 0
        dx = lambda1 * Math.cos(shita); // 100
        dy = lambda1 * Math.sin(shita); // 0
        const child31 = {};
        /* child31['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice1[2].y + dy, 0),
                              new Vector3(0, vertice1[2].y + dy, 0),
                            ];
        child31['position'] = new Vector3(position1.x + w1 - dx, position1.y, position1.z)
        result.push(child31); // 1部材の1つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0),
                                ],
                      'position': new Vector3(position1.x + w1 - dx, position1.y, position1.z)
                    }); // 1部材の1つ目
        dx = lambda2 * Math.cos(shita); // 100
        dy = lambda2 * Math.sin(shita); // 0
        /* const child32 = {};
        child32['vertice'] = [ new Vector3(0, 0, 0),
                             new Vector3(dx, dy, 0),
                             new Vector3(dx, vertice1[2].y + dy, 0),
                             new Vector3(0, vertice1[2].y + dy, 0),
                           ];
        child32['position'] = new Vector3(position1.x + w1, position1.y, position1.z)
        result.push(child32); // 1部材の2つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0),
                                ],
                      'position': new Vector3(position1.x + w1, position1.y, position1.z)
                    }); // 1部材の2つ目
        dx = lambda3 * Math.cos(shita); // 100
        dy = lambda3 * Math.sin(shita); // 0
        /* const child33 = {};
        child33['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice1[2].y + dy, 0),
                              new Vector3(0, vertice1[2].y + dy, 0),
                            ]
        child33['position'] = new Vector3(position1.x + w1 + w2 - dx, position1.y, position1.z)
        result.push(child33); // 1部材の3つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0),
                                ],
                      'position': new Vector3(position1.x + w1 + w2 - dx, position1.y, position1.z)
                    }); // 1部材の3つ目
        dx = lambda4 * Math.cos(shita); // 100
        dy = lambda4 * Math.sin(shita); // 0
        /* const child34 = {};
        child34['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice1[2].y + dy, 0),
                              new Vector3(0, vertice1[2].y + dy, 0),
                            ];
        child34['position'] = new Vector3(position1.x + w1 + w2, position1.y, position1.z)
        result.push(child34); // 1部材の4つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice1[2].y + dy, 0),
                                  new Vector3(0, vertice1[2].y + dy, 0),
                                ],
                      'position': new Vector3(position1.x + w1 + w2, position1.y, position1.z)
                    }); // 1部材の4つ目

        // 2部材
        result.push(vertices[1]); // 2部材の1つ目

        // 3部材
        result.push(vertices[2]); // 3部材の1つ目

        // 4部材
        shita = Math.atan((vertice4[1].y - vertice4[0].y) / (vertice4[1].x - vertice4[0].x));  // 0
        dx = lambda1 * Math.cos(shita); // 100
        dy = lambda1 * Math.sin(shita); // 0
        /* const child35 = {};
        child35['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice4[2].y + dy, 0),
                              new Vector3(0, vertice4[2].y + dy, 0),
                            ],
        child35['position'] = new Vector3(position4.x + w1 - dx, position4.y, position4.z)
        result.push(child35); // 4部材の1つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice4[2].y + dy, 0),
                                  new Vector3(0, vertice4[2].y + dy, 0),
                                ],
                      'position': new Vector3(position4.x + w1 - dx, position4.y, position4.z)
                    }); // 4部材の1つ目
        dx = lambda2 * Math.cos(shita); // 100
        dy = lambda2 * Math.sin(shita); // 0
        /* const child36 = {};
        child36['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice4[2].y + dy, 0),
                              new Vector3(0, vertice4[2].y + dy, 0),
                            ];
        child36['position'] = new Vector3(position4.x + w4, position4.y, position4.z);
        result.push(child36); // 4部材の2つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice4[2].y + dy, 0),
                                  new Vector3(0, vertice4[2].y + dy, 0),
                                ],
                      'position': new Vector3(position4.x + w4, position4.y, position4.z)
                    }); // 4部材の2つ目
        /* const child37 = {};
        child37['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice4[2].y + dy, 0),
                              new Vector3(0, vertice4[2].y + dy, 0),
                            ]
        child37['position'] = new Vector3(position4.x + w4 + w3 - dx, position4.y, position4.z);
        result.push(child37); // 4部材の3つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice4[2].y + dy, 0),
                                  new Vector3(0, vertice4[2].y + dy, 0),
                                ],
                      'position': new Vector3(position4.x + w4 + w3 - dx, position4.y, position4.z)
                    }); // 4部材の3つ目
        dx = lambda1 * Math.cos(shita); // 100
        dy = lambda1 * Math.sin(shita); // 0
        /* const child38 = {};
        child38['vertice'] = [ new Vector3(0, 0, 0),
                              new Vector3(dx, dy, 0),
                              new Vector3(dx, vertice4[2].y + dy, 0),
                              new Vector3(0, vertice4[2].y + dy, 0),
                            ],
        child38['position'] = new Vector3(position4.x + w4 + w2, position4.y, position4.z)
        result.push(child38); // 4部材の4つ目 */
        result.push({ 'vertice': [new Vector3(0, 0, 0),
                                  new Vector3(dx, dy, 0),
                                  new Vector3(dx, vertice4[2].y + dy, 0),
                                  new Vector3(0, vertice4[2].y + dy, 0),
                                ],
                      'position': new Vector3(position4.x + w4 + w2, position4.y, position4.z)
                    }); // 4部材の4つ目

        break;

      case ('Circle'):

        break;
    }
    // }

    return result;
  }

}