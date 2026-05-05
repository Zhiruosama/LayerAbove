/**
 * LayerAboveTools - 在选中图层上方创建等长对齐的调整层/固态层/空对象（可选绑定父子），或在游标处创建单帧调整层。
 * 使用：复制到 AE 的 ScriptUI Panels 目录后重启 AE，或通过「文件 > 脚本 > 运行脚本文件」运行。
 */
(function layerAboveTools(thisObj) {
  function getActiveComp() {
    var ai = app.project.activeItem;
    if (!ai || !(ai instanceof CompItem)) return null;
    return ai;
  }

  /** 取当前合成中「最靠上」的已选图层（索引最小），无则 null */
  function getTopmostSelectedLayer(comp) {
    var best = null;
    var bestIndex = 999999;
    var i;
    for (i = 1; i <= comp.numLayers; i++) {
      var lyr = comp.layer(i);
      if (lyr.selected) {
        if (i < bestIndex) {
          bestIndex = i;
          best = lyr;
        }
      }
    }
    return best;
  }

  /** 当前合成中所有已选图层，顺序为时间轴由上到下（索引递增） */
  function getSelectedLayersOrdered(comp) {
    var arr = [];
    var i;
    for (i = 1; i <= comp.numLayers; i++) {
      var lyr = comp.layer(i);
      if (lyr.selected) arr.push(lyr);
    }
    return arr;
  }

  function alignTimeAndMoveAbove(comp, newLayer, refLayer) {
    newLayer.inPoint = refLayer.inPoint;
    newLayer.outPoint = refLayer.outPoint;
    newLayer.moveBefore(refLayer);
  }

  /** 旧版 AE 无 layers.addAdjLayer，用全尺寸固态层 + adjustmentLayer 等效 */
  function createAdjustmentLayer(comp, duration, name) {
    if (duration <= 0) duration = comp.frameDuration;
    var lyr = comp.layers.addSolid(
      [1, 1, 1],
      name || "调整图层",
      comp.width,
      comp.height,
      comp.pixelAspect,
      duration
    );
    lyr.adjustmentLayer = true;
    return lyr;
  }

  function onAddAdjustmentAbove() {
    var comp = getActiveComp();
    if (!comp) {
      alert("请先打开一个合成。");
      return;
    }
    var ref = getTopmostSelectedLayer(comp);
    if (!ref) {
      alert("请选中一个图层。");
      return;
    }
    app.beginUndoGroup("上方创建调整图层");
    try {
      var dur = ref.outPoint - ref.inPoint;
      var adj = createAdjustmentLayer(comp, dur, "调整图层");
      alignTimeAndMoveAbove(comp, adj, ref);
    } catch (e) {
      alert("错误: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  function onAddSolidAbove() {
    var comp = getActiveComp();
    if (!comp) {
      alert("请先打开一个合成。");
      return;
    }
    var ref = getTopmostSelectedLayer(comp);
    if (!ref) {
      alert("请选中一个图层。");
      return;
    }
    app.beginUndoGroup("上方创建固态层");
    try {
      var dur = ref.outPoint - ref.inPoint;
      if (dur <= 0) dur = comp.frameDuration;
      var solid = comp.layers.addSolid(
        [1, 1, 1],
        "白固态层",
        comp.width,
        comp.height,
        comp.pixelAspect,
        dur
      );
      alignTimeAndMoveAbove(comp, solid, ref);
    } catch (e) {
      alert("错误: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  /** 在最上层已选图层上方新建空对象，并把当前所有已选图层挂为其子层 */
  function onAddNullAboveAndParent() {
    var comp = getActiveComp();
    if (!comp) {
      alert("请先打开一个合成。");
      return;
    }
    var layers = getSelectedLayersOrdered(comp);
    if (layers.length === 0) {
      alert("请选中至少一个图层。");
      return;
    }
    var ref = getTopmostSelectedLayer(comp);
    app.beginUndoGroup("上方空对象并绑定父子");
    try {
      var dur = ref.outPoint - ref.inPoint;
      if (dur <= 0) dur = comp.frameDuration;
      var nl = comp.layers.addNull(dur);
      alignTimeAndMoveAbove(comp, nl, ref);
      var j;
      for (j = 0; j < layers.length; j++) {
        var lyr = layers[j];
        if (lyr === nl) continue;
        try {
          lyr.parent = nl;
        } catch (eP) {}
      }
    } catch (e) {
      alert("错误: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  function onAddSingleFrameAdjAtCTI() {
    var comp = getActiveComp();
    if (!comp) {
      alert("请先打开一个合成。");
      return;
    }
    var ref = getTopmostSelectedLayer(comp);
    app.beginUndoGroup("游标处单帧调整图层");
    try {
      var fd = comp.frameDuration;
      var t = comp.time;
      var adj = createAdjustmentLayer(comp, fd, "单帧调整");
      adj.inPoint = t;
      adj.outPoint = t + fd;
      if (ref) {
        adj.moveBefore(ref);
      }
    } catch (e) {
      alert("错误: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  function buildUI(root) {
    var isPanel = root instanceof Panel;
    var w = isPanel ? root : new Window("palette", "图层上方工具", undefined, { resizeable: true });
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];
    w.spacing = 0;
    w.margins = [18, 16, 18, 16];

    var head = w.add("group");
    head.orientation = "column";
    head.alignChildren = ["fill", "top"];
    head.spacing = 4;
    head.margins = [0, 0, 0, 14];

    var title = head.add("statictext", undefined, "图层上方工具");
    title.justify = "center";
    try {
      title.graphics.font = ScriptUI.newFont(
        "dialog",
        17,
        ScriptUI.FontStyle.BOLD
      );
    } catch (eTf) {}

    var sub = head.add("statictext", undefined, "所选图层或当前时间", { multiline: false });
    sub.justify = "center";
    try {
      sub.graphics.font = ScriptUI.newFont(
        "dialog",
        11,
        ScriptUI.FontStyle.REGULAR
      );
    } catch (eSf) {}

    var body = w.add("group");
    body.orientation = "column";
    body.alignChildren = ["fill", "top"];
    body.spacing = 10;

    var lab1 = body.add("statictext", undefined, "所选图层上方");
    lab1.justify = "left";
    try {
      lab1.graphics.font = ScriptUI.newFont(
        "dialog",
        10,
        ScriptUI.FontStyle.BOLD
      );
    } catch (eL1) {}

    var btnAdj = body.add("button", undefined, "等长调整图层");
    var btnSolid = body.add("button", undefined, "等长白色固态层");
    btnAdj.helpTip =
      "在参考图层上方创建调整图层，入点与出点与其一致。需至少选中一个图层。";
    btnSolid.helpTip =
      "在参考图层上方创建全尺寸白色固态层，时长与其一致。需至少选中一个图层。";

    var btnNull = body.add("button", undefined, "空对象（绑定父子）");
    btnNull.helpTip =
      "在最上层已选图层上方新建空对象（时长对齐），图层名由 AE 按语言自动递增（如「空 1」或 Null 1）；所选图层全部设为该空对象的子层。";

    var lab2 = body.add("statictext", undefined, "当前时间");
    lab2.justify = "left";
    try {
      lab2.graphics.font = ScriptUI.newFont(
        "dialog",
        10,
        ScriptUI.FontStyle.BOLD
      );
    } catch (eL2) {}

    var btnOneFrame = body.add("button", undefined, "单帧调整图层");
    btnOneFrame.helpTip =
      "在当前时间插入仅一帧的调整图层。可选中图层以决定叠放顺序。";

    var hint = w.add(
      "statictext",
      undefined,
      "说明：多选时以最上层已选图层为参考；空对象按钮会将所选图层全部挂到新空对象下。",
      {
        multiline: true,
      }
    );
    hint.justify = "left";
    hint.characters = 26;
    hint.margins = [0, 14, 0, 0];

    var buttons = [btnAdj, btnSolid, btnNull, btnOneFrame];

    function fontSizeForButtonHeight(h) {
      var s = Math.round(12 + (h - 44) * 0.11);
      if (s < 12) s = 12;
      if (s > 18) s = 18;
      return s;
    }

    function applyButtonMetrics(btnH) {
      var i;
      for (i = 0; i < buttons.length; i++) {
        buttons[i].preferredSize = [-1, btnH];
        buttons[i].minimumSize = [0, 40];
        try {
          if (buttons[i].graphics) {
            buttons[i].graphics.font = ScriptUI.newFont(
              "dialog",
              fontSizeForButtonHeight(btnH),
              ScriptUI.FontStyle.BOLD
            );
          }
        } catch (eBf) {}
      }
    }

    function syncLayout() {
      var ch = w.size.height;
      var cw = w.size.width;
      var btnH = 48;
      if (cw >= 40 && ch >= 80) {
        var headBlock = 76;
        var hintBlock = 52;
        var l1 = 16;
        var l2 = 16;
        try {
          if (head.size && head.size.height > 0) {
            headBlock = head.size.height + head.margins.bottom;
          }
          if (hint.size && hint.size.height > 0) {
            hintBlock = hint.size.height + hint.margins.top;
          }
          if (lab1.size && lab1.size.height > 0) l1 = lab1.size.height;
          if (lab2.size && lab2.size.height > 0) l2 = lab2.size.height;
        } catch (eSz) {}

        var fixed =
          w.margins.top +
          w.margins.bottom +
          headBlock +
          hintBlock +
          l1 +
          l2 +
          body.spacing * 5 +
          8;
        btnH = Math.floor((ch - fixed) / 4);
        if (btnH < 42) btnH = 42;
        if (btnH > 88) btnH = 88;
      }
      applyButtonMetrics(btnH);
    }

    btnAdj.onClick = onAddAdjustmentAbove;
    btnSolid.onClick = onAddSolidAbove;
    btnNull.onClick = onAddNullAboveAndParent;
    btnOneFrame.onClick = onAddSingleFrameAdjAtCTI;

    w.onResizing = w.onResize = function () {
      syncLayout();
      this.layout.resize();
    };

    w.layout.layout(true);
    syncLayout();
    w.layout.resize();
    syncLayout();

    if (!isPanel) {
      w.preferredSize = [300, 360];
      w.minimumSize = [260, 260];
    }

    return w;
  }

  var ui = buildUI(thisObj);
  if (ui instanceof Window) {
    ui.center();
    ui.show();
  }
})(this);
