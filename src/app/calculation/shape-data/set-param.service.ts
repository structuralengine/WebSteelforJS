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

}