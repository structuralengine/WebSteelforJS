"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ThreePanelService = void 0;
var core_1 = require("@angular/core");
var THREE = require("three");
var ThreePanelService = /** @class */ (function () {
    function ThreePanelService(scene, http, steel, helper) {
        this.scene = scene;
        this.http = http;
        this.steel = steel;
        this.helper = helper;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.panel_List = new Array();
        // gui
        this.scale = 1.0;
        this.params = {
            meshScale: this.scale
        };
        this.gui = null;
    }
    ThreePanelService.prototype.changeData = function (index) {
        var data = this.steel.getSteelJson(index);
        //対象のnodeDataを入手
        var vertexlist = [];
        this.ClearData();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        var i = 0;
        // for (let i = 0; i < data.length; i++) {
        for (var _i = 0, _a = Object.keys(data); _i < _a.length; _i++) {
            var i_1 = _a[_i];
            var row = data[i_1];
            var j = this.helper.toNumber(row["design_point_id"]);
            if (j === null)
                continue;
            //for (let j = 0; j < data[i].length; j++) {
            // vertexlist.push(data[i][j]);
            vertexlist.push(row);
            if (j % 5 === 0) {
                this.shape(vertexlist /* , data['shape'] */);
                vertexlist = new Array();
            }
        }
    };
    ThreePanelService.prototype.shape = function (vertexlist /* , shape: string */) {
        var shape = vertexlist[0]["shape"];
        // データが有効か確認する
        var flag = this.getEnableSteel(vertexlist, shape);
        var vertices;
        if (flag) {
            switch (shape) {
                case "I形":
                    vertices = this.getVertices_I(vertexlist);
                    this.createPlane(vertices);
                    break;
                case "H形":
                    vertices = this.getVertices_H(vertexlist);
                    this.createPlane(vertices);
                    break;
                case "箱形/π形":
                    vertices = this.getVertices_box(vertexlist);
                    this.createPlane(vertices);
                    break;
                case "鋼管":
                    vertices = this.getVertices_pipe(vertexlist);
            }
        }
    };
    ThreePanelService.prototype.getVertices_pipe = function (vertexlist) {
        var scale = 0.1;
        // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
        var b1 = vertexlist[0]["steel_b"] !== undefined
            ? vertexlist[0]["steel_b"] * scale
            : 0;
        var h1 = vertexlist[0]["steel_h"] !== undefined
            ? vertexlist[0]["steel_h"] * scale
            : 0;
        var geometry = new THREE.TorusGeometry(b1, h1, 16, 100);
        var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        var torus = new THREE.Mesh(geometry, material);
        this.scene.add(torus);
    };
    ThreePanelService.prototype.getVertices_I = function (vertexlist) {
        var vertices = []; // returnする頂点情報
        var scale = 0.1;
        // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
        var b1 = vertexlist[0]["steel_b"] !== undefined
            ? vertexlist[0]["steel_b"] * scale
            : 0;
        var h1 = vertexlist[0]["steel_h"] !== undefined
            ? vertexlist[0]["steel_h"] * scale
            : 0;
        var w1 = vertexlist[0]["steel_w"] !== undefined
            ? vertexlist[0]["steel_w"] * scale
            : 0;
        var b2 = vertexlist[1]["steel_b"] !== undefined
            ? vertexlist[1]["steel_b"] * scale
            : 0;
        var h2 = vertexlist[1]["steel_h"] !== undefined
            ? vertexlist[1]["steel_h"] * scale
            : 0;
        var b3 = vertexlist[2]["steel_b"] !== undefined
            ? vertexlist[2]["steel_b"] * scale
            : 0;
        var h3 = vertexlist[2]["steel_h"] !== undefined
            ? vertexlist[2]["steel_h"] * scale
            : 0;
        var w3 = vertexlist[2]["steel_w"] !== undefined
            ? vertexlist[2]["steel_w"] * scale
            : 0;
        // パターンごとに分岐
        var list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
        ////////// 1部材について //////////
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b1, 0, 0));
        list.vertice.push(new THREE.Vector3(b1, -h1, 0));
        list.vertice.push(new THREE.Vector3(0, -h1, 0));
        list.position = new THREE.Vector3(0, 0, 0);
        vertices.push(list); // 頂点情報を追加
        ////////// 2部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, -h2, 0));
        list.vertice.push(new THREE.Vector3(0, -h2, 0));
        list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
        vertices.push(list); // 頂点情報を追加
        //////////3部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, -h3, 0));
        list.vertice.push(new THREE.Vector3(0, -h3, 0));
        list.position = new THREE.Vector3(w1 - w3, -(h1 + h2), 0);
        vertices.push(list); // 頂点情報を追加
        return vertices;
    };
    ThreePanelService.prototype.getVertices_H = function (vertexlist) {
        var vertices = []; // returnする頂点情報
        var scale = 0.1;
        // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
        var b1 = vertexlist[0]["steel_b"] !== undefined
            ? vertexlist[0]["steel_b"] * scale
            : 0;
        var h1 = vertexlist[0]["steel_h"] !== undefined
            ? vertexlist[0]["steel_h"] * scale
            : 0;
        var w1 = vertexlist[0]["steel_w"] !== undefined
            ? vertexlist[0]["steel_w"] * scale
            : 0;
        var b2 = vertexlist[1]["steel_b"] !== undefined
            ? vertexlist[1]["steel_b"] * scale
            : 0;
        var h2 = vertexlist[1]["steel_h"] !== undefined
            ? vertexlist[1]["steel_h"] * scale
            : 0;
        var b3 = vertexlist[2]["steel_b"] !== undefined
            ? vertexlist[2]["steel_b"] * scale
            : 0;
        var h3 = vertexlist[2]["steel_h"] !== undefined
            ? vertexlist[2]["steel_h"] * scale
            : 0;
        var w3 = vertexlist[2]["steel_w"] !== undefined
            ? vertexlist[2]["steel_w"] * scale
            : 0;
        // パターンごとに分岐
        var list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
        ////////// 1部材について //////////
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b1, 0, 0));
        list.vertice.push(new THREE.Vector3(b1, -h1, 0));
        list.vertice.push(new THREE.Vector3(0, -h1, 0));
        list.position = new THREE.Vector3(0, 0, 0);
        vertices.push(list); // 頂点情報を追加
        ////////// 2部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, 0, 0));
        list.vertice.push(new THREE.Vector3(b2, -h2, 0));
        list.vertice.push(new THREE.Vector3(0, -h2, 0));
        list.position = new THREE.Vector3(b1, -w1 + h2 / 2, 0);
        vertices.push(list); // 頂点情報を追加
        //////////3部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, 0, 0));
        list.vertice.push(new THREE.Vector3(b3, -h3, 0));
        list.vertice.push(new THREE.Vector3(0, -h3, 0));
        list.position = new THREE.Vector3(b1 + b2, w3 - w1, 0);
        vertices.push(list); // 頂点情報を追加
        return vertices;
    };
    ThreePanelService.prototype.getVertices_box = function (vertexlist) {
        var vertices = []; // returnする頂点情報
        var scale = 0.1;
        // memo: list[0～4]でkeyはsteel_b, steel_h, steel_w
        var b1 = vertexlist[0]["steel_b"] !== undefined
            ? vertexlist[0]["steel_b"] * scale
            : 0;
        var h1 = vertexlist[0]["steel_h"] !== undefined
            ? vertexlist[0]["steel_h"] * scale
            : 0;
        var w1 = vertexlist[0]["steel_w"] !== undefined
            ? vertexlist[0]["steel_w"] * scale
            : 0;
        var b2 = vertexlist[1]["steel_b"] !== undefined
            ? vertexlist[1]["steel_b"] * scale
            : 0;
        var h2 = vertexlist[1]["steel_h"] !== undefined
            ? vertexlist[1]["steel_h"] * scale
            : 0;
        var w2 = vertexlist[1]["steel_w"] !== undefined
            ? vertexlist[1]["steel_w"] * scale
            : 0;
        var b3 = vertexlist[2]["steel_b"] !== undefined
            ? vertexlist[2]["steel_b"] * scale
            : 0;
        var h3 = vertexlist[2]["steel_h"] !== undefined
            ? vertexlist[2]["steel_h"] * scale
            : 0;
        var w3 = vertexlist[2]["steel_w"] !== undefined
            ? vertexlist[2]["steel_w"] * scale
            : 0;
        var b4 = vertexlist[3]["steel_b"] !== undefined
            ? vertexlist[3]["steel_b"] * scale
            : 0;
        var h4 = vertexlist[3]["steel_h"] !== undefined
            ? vertexlist[3]["steel_h"] * scale
            : 0;
        var w4 = vertexlist[3]["steel_w"] !== undefined
            ? vertexlist[3]["steel_w"] * scale
            : 0;
        var b5 = vertexlist[4]["steel_b"] !== undefined
            ? vertexlist[4]["steel_b"] * scale
            : 0;
        var h5 = vertexlist[4]["steel_h"] !== undefined
            ? vertexlist[4]["steel_h"] * scale
            : 0;
        var w5 = vertexlist[4]["steel_w"] !== undefined
            ? vertexlist[4]["steel_w"] * scale
            : 0;
        // パターンごとに分岐
        var PIflag = w2 > b4 || w3 > b4;
        var list = { vertice: [], position: new THREE.Vector3(0, 0, 0) };
        ////////// 1部材について //////////
        // h2 !== h3 && PIflag === falseの時、右肩上がり(下がり)になる
        if (h2 === h3 || PIflag === true) {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b1, 0, 0));
            list.vertice.push(new THREE.Vector3(b1, -h1, 0));
            list.vertice.push(new THREE.Vector3(0, -h1, 0));
            list.position = new THREE.Vector3(0, 0, 0);
        }
        else {
            // 未計算状態
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b1, 0, 0));
            list.vertice.push(new THREE.Vector3(b1, -h1, 0));
            list.vertice.push(new THREE.Vector3(0, -h1, 0));
            list.position = new THREE.Vector3(0, 0, 0);
        }
        vertices.push(list); // 頂点情報を追加
        ////////// 2部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
        if (w2 === w3) {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b2, 0, 0));
            list.vertice.push(new THREE.Vector3(b2, -h2, 0));
            list.vertice.push(new THREE.Vector3(0, -h2, 0));
            list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
        }
        else if (w2 < w3) {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b2, 0, 0));
            list.vertice.push(new THREE.Vector3(b2 - (w3 - w2) / 2, -h2, 0));
            list.vertice.push(new THREE.Vector3(-(w3 - w2) / 2, -h2, 0));
            // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
            // 分岐を追加したら、コメントを削除
            list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
        }
        else {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b2, 0, 0));
            list.vertice.push(new THREE.Vector3(b2 + (w2 - w3) / 2, -h2, 0));
            list.vertice.push(new THREE.Vector3((w2 - w3) / 2, -h2, 0));
            // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
            // 分岐を追加したら、コメントを削除
            list.position = new THREE.Vector3(w1 - b2 / 2, -h1, 0);
        }
        vertices.push(list); // 頂点情報を追加
        ////////// 3部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        // w2とw3の値によって分岐. w2 < w3, w2 === w3, w2 > w3
        if (w2 === w3) {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b3, 0, 0));
            list.vertice.push(new THREE.Vector3(b3, -h3, 0));
            list.vertice.push(new THREE.Vector3(0, -h3, 0));
            list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
        }
        else if (w2 < w3) {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b3, 0, 0));
            list.vertice.push(new THREE.Vector3(b3 + (w3 - w2) / 2, -h3, 0));
            list.vertice.push(new THREE.Vector3((w3 - w2) / 2, -h3, 0));
            // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
            // 分岐を追加したら、コメントを削除
            list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
        }
        else {
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b3, 0, 0));
            list.vertice.push(new THREE.Vector3(b3 - (w2 - w3) / 2, -h3, 0));
            list.vertice.push(new THREE.Vector3(-(w2 - w3) / 2, -h3, 0));
            // 1部材の形状によって分岐するため、変数化したい. 下記のコードは1部材は水平のとき
            // 分岐を追加したら、コメントを削除
            list.position = new THREE.Vector3(w1 + w2 - b3 / 2, -h1, 0);
        }
        vertices.push(list); // 頂点情報を追加
        ////////// 4部材について //////////
        list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
        // positionのみ分岐. 1, 2, 3部材の位置によって分岐する
        list.vertice.push(new THREE.Vector3(0, 0, 0));
        list.vertice.push(new THREE.Vector3(b4, 0, 0));
        list.vertice.push(new THREE.Vector3(b4, -h4, 0));
        list.vertice.push(new THREE.Vector3(0, -h4, 0));
        if (PIflag === false) {
            // box型であれば
            if (h2 === h3) {
                list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, -h1 - h2, 0); // パターンA
            }
            else if (h2 > h3) {
                // 未計算状態. 計算後にコメントを削除
                list.position = new THREE.Vector3(w1 - w4, -h1 - h2, 0); // パターンB
            }
            else {
                // 未計算状態. 計算後にコメントを削除
                list.position = new THREE.Vector3(w1 - w4, -h1 - h2, 0); // パターンC
            }
        }
        else {
            // PI型であれば
            list.position = new THREE.Vector3(w1 + (w2 - w3) / 2 - w4, -h1 - h2, 0); // パターンA
        }
        vertices.push(list); // 頂点情報を追加
        if (PIflag) {
            // PI型であれは5部材を設定する
            ////////// 5部材について //////////
            list = { vertice: [], position: new THREE.Vector3(0, 0, 0) }; // リセット
            // w2 === w3の条件で形状が分岐する. 計算式が同じためpositionの分岐は無し.
            list.vertice.push(new THREE.Vector3(0, 0, 0));
            list.vertice.push(new THREE.Vector3(b5, 0, 0));
            list.vertice.push(new THREE.Vector3(b5, -h5, 0));
            list.vertice.push(new THREE.Vector3(0, -h5, 0));
            list.position = new THREE.Vector3(w1 + (w2 + w3) / 2 - w5, -(h1 + h3), 0);
        }
        return vertices;
    };
    ThreePanelService.prototype.getCentroid = function (child) {
        var Ax = 0;
        var Ay = 0;
        var Az = 0;
        var A = 0;
        for (var _i = 0, _a = child.children; _i < _a.length; _i++) {
            var mesh = _a[_i];
            var vertice = mesh.vertice;
            var position = mesh.pos;
            // ベクトルAB（ab）とベクトルAC（ac）とベクトルAD（ad）
            var ab = new THREE.Vector3(vertice[1].x - vertice[0].x, vertice[1].y - vertice[0].y, vertice[1].z - vertice[0].z);
            var ac = new THREE.Vector3(vertice[2].x - vertice[0].x, vertice[2].y - vertice[0].y, vertice[2].z - vertice[0].z);
            var ad = new THREE.Vector3(vertice[3].x - vertice[0].x, vertice[3].y - vertice[0].y, vertice[3].z - vertice[0].z);
            // meshの三角形Aの重心（centroid1）と、面積（area1）をベクトルから算出
            var centroid1 = new THREE.Vector3((0 + ab.x + ac.x) / 3 + vertice[0].x, (0 + ab.y + ac.y) / 3 + vertice[0].y, (0 + ab.z + ac.z) / 3 + vertice[0].z);
            var area1 = Math.pow((Math.pow((ab.y * ac.z - ab.z * ac.y), 2) +
                Math.pow((ab.z * ac.x - ab.x * ac.z), 2) +
                Math.pow((ab.x * ac.y - ab.y * ac.x), 2)), 0.5) /
                2;
            // meshの三角形Bの重心（centroid2）と、面積（area2）をベクトルから算出
            var centroid2 = new THREE.Vector3((0 + ac.x + ad.x) / 3 + vertice[0].x, (0 + ac.y + ad.y) / 3 + vertice[0].y, (0 + ac.z + ad.z) / 3 + vertice[0].z);
            var area2 = Math.pow((Math.pow((ac.y * ad.z - ac.z * ad.y), 2) +
                Math.pow((ac.z * ad.x - ac.x * ad.z), 2) +
                Math.pow((ac.x * ad.y - ac.y * ad.x), 2)), 0.5) /
                2;
            // 2つの三角形から, 四角形の重心（centroid0）と面積（area0）を算出し加算する
            var area0 = area1 + area2;
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
        var centroid = new THREE.Vector3(Ax / A, Ay / A, Az / A);
        return centroid;
    };
    ThreePanelService.prototype.createPlane = function (vertices) {
        var child = new THREE.Group();
        for (var _i = 0, vertices_1 = vertices; _i < vertices_1.length; _i++) {
            var list = vertices_1[_i];
            var points = [];
            for (var _a = 0, _b = [0, 1, 2, 0, 2, 3]; _a < _b.length; _a++) {
                var num = _b[_a];
                points.push(list.vertice[num]);
            }
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var material = new THREE.MeshBasicMaterial({
                color: 0x3366cc,
                side: THREE.DoubleSide
            });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(list.position.x, list.position.y, list.position.z);
            mesh["vertice"] = list.vertice;
            mesh["pos"] = list.position;
            child.add(mesh);
        }
        // 重心位置を算出し、重心位置を原点に移動する
        var centroid = this.getCentroid(child);
        child.position.set(-centroid.x, -centroid.y, -centroid.z);
        this.panel_List.push(child);
        this.scene.add(child);
    };
    ThreePanelService.prototype.shapeOfBox = function (newList) {
        // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
        newList["x1"] = 0;
        newList["x2"] = -(newList["b1"] / 2 - newList["w1"]);
        // newList["x3"] = newList["b3"] / 2 - newList["w3"] - newList["w2"] / 2;
        newList["x3"] = newList["x2"] + newList["b3"] / 2 - newList["w3"];
        newList["x4"] = newList["x2"] + newList["w2"];
        if (newList["b1"] == newList["w2"]) {
            newList["y1"] = newList["h2"] / 2 - newList["h1"] / 2;
        }
        else {
            newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
        }
        newList["y2"] = 0;
        newList["y3"] = -(newList["h2"] / 2 + newList["h3"] / 2);
        newList["y4"] = newList["h2"] / 2 - newList["h4"] / 2;
        for (var i = 1; i <= 4; i++) {
            // 三次元
            // let geometry = new THREE.BoxBufferGeometry(
            //   newList["b" + i],
            //   newList["h" + i],
            //   50
            // );
            // 二次元
            var geometry = new THREE.PlaneBufferGeometry(newList["b" + i], newList["h" + i], 50);
            var material = new THREE.MeshBasicMaterial({
                color: 0x8b0000,
                side: THREE.DoubleSide,
                opacity: 0.6
            });
            var plane = new THREE.Mesh(geometry, material);
            plane.name = "plane";
            plane.position.set(newList["x" + i], newList["y" + i], 0);
            this.scene.add(plane);
            this.panel_List.push(plane);
            // 三次元
            // geometry = new THREE.BoxBufferGeometry();
            // 二次元
            geometry = new THREE.PlaneBufferGeometry();
        }
    };
    ThreePanelService.prototype.shapeOfPi = function (newList) {
        // ②を基準として，矩形の重心間距離を求める→各矩形のx,y座標
        newList["x1"] = 0;
        newList["x2"] = -(newList["b1"] / 2 - newList["w1"]);
        newList["x3"] = newList["x2"] + newList["b3"] / 2 - newList["w3"];
        newList["x4"] = newList["x2"] + newList["w2"];
        newList["x5"] = newList["x4"] + newList["b5"] / 2 - newList["w5"];
        if (newList["b1"] == newList["w2"]) {
            newList["y1"] = newList["h2"] / 2 - newList["h1"] / 2;
        }
        else {
            newList["y1"] = newList["h1"] / 2 + newList["h2"] / 2;
        }
        newList["y2"] = 0;
        newList["y3"] = -(newList["h2"] / 2 + newList["h3"] / 2);
        newList["y4"] = newList["h2"] / 2 - newList["h4"] / 2;
        newList["y5"] = newList["y4"] - newList["h4"] / 2 - newList["h5"] / 2;
        for (var i = 1; i <= 5; i++) {
            // 三次元
            // let geometry = new THREE.BoxBufferGeometry(
            //   newList["b" + i],
            //   newList["h" + i],
            //   50
            // );
            // 二次元
            var geometry = new THREE.PlaneBufferGeometry(newList["b" + i], newList["h" + i], 50);
            var material = new THREE.MeshBasicMaterial({
                color: 0x8b0000,
                side: THREE.DoubleSide,
                opacity: 0.6
            });
            var plane = new THREE.Mesh(geometry, material);
            plane.name = "plane";
            plane.position.set(newList["x" + i], newList["y" + i], 0);
            this.scene.add(plane);
            this.panel_List.push(plane);
            // 三次元
            // geometry = new THREE.BoxBufferGeometry();
            // 二次元
            geometry = new THREE.PlaneBufferGeometry();
        }
    };
    // データをクリアする
    ThreePanelService.prototype.ClearData = function () {
        for (var _i = 0, _a = this.panel_List; _i < _a.length; _i++) {
            var mesh = _a[_i];
            // 文字を削除する
            while (mesh.children.length > 0) {
                var object = mesh.children[0];
                object.parent.remove(object);
            }
            // オブジェクトを削除する
            this.scene.remove(mesh);
        }
        this.panel_List = new Array();
    };
    // 有効な行かどうか確認する
    ThreePanelService.prototype.getEnableSteel = function (vertexlist, shape) {
        // shapeに合わせて、vertexlistの必要行数を変更する
        var until;
        if (shape === "I形" || shape === "H形") {
            until = 3;
        }
        else if (shape === "箱形/π形") {
            until = 4;
        }
        else if (shape === "鋼管") {
            until = 1;
        }
        else {
            return false;
        }
        // bとhの情報がなければ、falseでリターンし、描画を中止する
        var count = 1;
        for (var _i = 0, _a = Object.keys(vertexlist); _i < _a.length; _i++) {
            var key = _a[_i];
            var row = vertexlist[key];
            if (row["steel_b"] == null || row["steel_h"] == null) {
                return false;
            }
            if (count >= until) {
                break;
            }
            else {
                count += 1;
            }
        }
        // 最後まで通った場合、有効なデータであるため、trueを返す
        return true;
    };
    ThreePanelService = __decorate([
        core_1.Injectable({
            providedIn: "root"
        })
    ], ThreePanelService);
    return ThreePanelService;
}());
exports.ThreePanelService = ThreePanelService;
