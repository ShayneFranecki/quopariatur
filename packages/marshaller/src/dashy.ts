import { JSEditor, JSONEditor } from "@hpcc-js/codemirror";
import { PropertyExt, Utility, Widget } from "@hpcc-js/common";
import { DDL1, DDL2, ddl2Schema, isDDL2Schema, upgrade } from "@hpcc-js/ddl-shim";
import { DatasourceTable } from "@hpcc-js/dgrid";
import { Graph } from "@hpcc-js/graph";
import { PropertyEditor } from "@hpcc-js/other";
import { CommandPalette, CommandRegistry, ContextMenu, SplitPanel, TabPanel, WidgetAdapter } from "@hpcc-js/phosphor";
import { scopedLogger } from "@hpcc-js/util";
import { Activity } from "./ddl2/activities/activity";
import { Databomb, DatasourceAdapt } from "./ddl2/activities/databomb";
import { DSPicker } from "./ddl2/activities/dspicker";
import { Dashboard } from "./ddl2/dashboard";
import { DDLEditor } from "./ddl2/ddleditor";
import { GraphAdapter } from "./ddl2/graphadapter";
import { Element, ElementContainer } from "./ddl2/model/element";
import { Visualization } from "./ddl2/model/visualization";

const logger = scopedLogger("marshaller/dashy");

import "../src/dashy.css";

class Palette extends PropertyExt {

    private _owner: Palettes;

    constructor() {
        super();
    }

    owner(): Palettes;
    owner(_: Palettes): this;
    owner(_?: Palettes): Palettes | this {
        if (!arguments.length) return this._owner;
        this._owner = _;
        return this;
    }

    valid(): boolean {
        return false;
    }
}
Palette.prototype._class += " Palette";
interface Palette {
    paletteID(): string;
    paletteID(_: string): this;
    colors(): { [color: string]: string[] };
    colors(_: { [color: string]: string[] }): this;
}
Palette.prototype.publish("paletteID", "", "string", "ID", null, { optional: true });
Palette.prototype.publish("colors", {}, "object", "Custom Palette");

class Palettes extends PropertyExt {
    constructor() {
        super();
    }
}
Palettes.prototype._class += " Palettes";
interface Palettes {
    palette(): Palette[];
    palette(_: Palette[]): this;
}
Palettes.prototype.publish("palette", [], "propertyArray", "Custom Palettes", null, { autoExpand: Palette });

const palettes = new Palettes();

export class Dashy extends SplitPanel {

    private _elementContainer: ElementContainer = new ElementContainer();

    private _tabLHS = new TabPanel();
    private _dashboard: Dashboard = new Dashboard(this._elementContainer)
        .on("vizActivation", (viz: Element, wa: WidgetAdapter) => {
            this.selectionChanged(viz);
        })
        .on("vizStateChanged", (viz: Element) => {
            for (const filteredViz of this._elementContainer.filteredBy(viz.id())) {
                if (this._currElement === filteredViz) {
                    this.refreshPreview();
                }
            }
        })
        ;
    private _graphAdapter = new GraphAdapter(this._elementContainer);
    private _pipeline: Graph = new Graph()
        .allowDragging(false)
        .applyScaleOnLayout(true)
        .on("vertex_click", (row: any, col: string, sel: boolean, ext: any) => {
            const obj = row.__lparam[0] || {};
            this.selectionChanged(obj.viz, obj.activity || obj.datasource);
        })
        .on("vertex_contextmenu", (row: any, col: string, sel: boolean, ext: any) => {
        })
        ;

    private _tabDDL = new TabPanel();
    private _ddlSchema = new JSONEditor().json(ddl2Schema);
    private _ddlEditor = new DDLEditor();
    private _jsEditor = new JSEditor();
    private _layoutEditor = new JSONEditor();
    private _ddlv1 = new JSONEditor();
    private _ddlv2 = new JSONEditor();

    private _tabRHS = new TabPanel();
    private _splitView = new SplitPanel();
    private _viewProperties: PropertyEditor = new PropertyEditor()
        .show_settings(false)
        .showFields(false)
        ;
    private _viewPreview = new DatasourceTable().pagination(true);
    private _widgetProperties: PropertyEditor = new PropertyEditor()
        .show_settings(false)
        .showFields(false)
        ;
    private _paletteProperties: PropertyEditor = new PropertyEditor()
        .show_settings(false)
        .showFields(false)
        ;
    private _stateProperties: PropertyEditor = new PropertyEditor()
        .show_settings(false)
        .showFields(false)
        ;
    private _cloneEC: ElementContainer = new ElementContainer();
    private _clone: Dashboard = new Dashboard(this._cloneEC).hideSingleTabs(true);
    private _fileOpen;

    constructor() {
        super("horizontal");
    }

    elementContainer(): ElementContainer {
        return this._elementContainer;
    }

    clear() {
        this._elementContainer.clear();
        this.loadDashboard().then(() => {
            this._elementContainer.refresh();
        });
    }

    save(): DDL2.Schema {
        return this._dashboard.save();
    }

    restore(json: DDL2.Schema): Promise<void> {
        this._elementContainer.clear();
        this._dashboard.restore(json);
        return this._dashboard.renderPromise().then(() => {
            return this._elementContainer.refresh();
        }).then(() => {
            for (const error of this._elementContainer.validate()) {
                logger.warning(error.elementID + " (" + error.source + "):  " + error.msg);
            }
        });
    }

    importDDL(ddl: DDL1.DDLSchema | DDL2.Schema, baseUrl?: string, wuid?: string) {
        let ddl2: DDL2.Schema;
        if (isDDL2Schema(ddl)) {
            ddl2 = ddl;
            this._ddlv2.json(ddl2);
            this._tabDDL
                .addWidget(this._ddlv2, "imported v2")
                ;
        } else {
            this._ddlv1.json(ddl);
            ddl2 = upgrade(ddl, baseUrl, wuid);
            this._ddlv2.json(ddl2);
            this._tabDDL
                .addWidget(this._ddlv1, "v1")
                .addWidget(this._ddlv2, "v1 -> v2")
                ;
        }
        this.restore(ddl2);
    }

    refreshPreview() {
        const ds = this._viewPreview.datasource() as DatasourceAdapt;
        if (ds) {
            ds.exec().then(() => {
                this._viewPreview
                    .invalidate()
                    .lazyRender()
                    ;
            });
        }
    }

    private _currElement: Element | undefined;
    private _currActivity: Activity | undefined;
    selectionChanged(elem?: Element, activity?: Activity) {
        if (elem && activity) {
            if (this._currElement !== elem || this._currActivity !== activity) {
                this._currElement = elem;
                this._currActivity = activity;
                this._tabRHS.childActivation(this._tabRHS.active());
            }
        } else if (elem) {
            if (this._currElement !== elem) {
                this._currElement = elem;
                this._currActivity = activity;
                this._tabRHS.childActivation(this._tabRHS.active());
            }
        } else if (activity) {
            if (this._currActivity !== activity) {
                this._currElement = elem;
                this._currActivity = activity;
                this._tabRHS.childActivation(this._tabRHS.active());
            }
        } else {
            if (this._currElement !== elem || this._currActivity !== activity) {
                this._currElement = elem;
                this._currActivity = activity;
                this._tabRHS.childActivation(this._tabRHS.active());
            }
        }
    }

    loadDataProps(pe: PropertyExt) {
        this._viewProperties
            .widget(pe)
            .render()
            ;
    }

    loadWidgetProps(pe: PropertyExt) {
        this._widgetProperties
            .widget(pe)
            .render()
            ;
    }

    loadPaletteProps(pe: PropertyExt) {
        this._paletteProperties
            .widget(pe)
            .render()
            ;
    }

    loadStateProps(pe: PropertyExt) {
        this._stateProperties
            .widget(pe)
            .render()
            ;
    }

    loadPreview(activity: undefined | Activity | Visualization) {
        this._viewPreview
            .datasource(new DatasourceAdapt(activity instanceof Activity ? activity : undefined))
            .lazyRender()
            ;
    }

    loadEditor() {
        //        this._editor.ddl(serialize(this._model) as object);
    }

    loadDashboard(refresh: boolean = true): Promise<Widget | undefined> {
        if (refresh && this._tabLHS.active() === this._dashboard) {
            return this._dashboard.renderPromise();
        }
        return Promise.resolve(undefined);
    }

    loadGraph(refresh: boolean = false) {
        this._pipeline
            .data({ ...this._graphAdapter.createGraph() }, false)
            ;
        if (refresh && this._tabLHS.active() === this._pipeline) {
            this._pipeline
                .layout("Hierarchy")
                .lazyRender()
                ;
        }
    }

    loadDDL(refresh: boolean = false) {
        this._ddlEditor
            .ddl(this._dashboard.ddl())
            ;
        if (refresh && this._tabLHS.active() === this._tabDDL && this._tabDDL.active() === this._ddlEditor) {
            this._ddlEditor
                .lazyRender()
                ;
        }
    }

    loadJavaScript(refresh: boolean = false) {
        this._jsEditor
            .javascript(this._dashboard.javascript())
            ;
        if (refresh && this._tabLHS.active() === this._tabDDL && this._tabDDL.active() === this._jsEditor) {
            this._jsEditor
                .lazyRender()
                ;
        }
    }

    loadLayout(refresh: boolean = false) {
        this._layoutEditor
            .json(this._dashboard.layout())
            ;
        if (refresh && this._tabLHS.active() === this._tabDDL && this._tabDDL.active() === this._layoutEditor) {
            this._layoutEditor
                .lazyRender()
                ;
        }
    }

    loadClone() {
        const json = this.save();
        this._cloneEC.clear();
        this._clone.renderPromise().then(() => {
            this._clone.restore(json);
            this._clone.renderPromise().then(() => {
                return this._cloneEC.refresh();
            }).then(() => {
                for (const error of this._cloneEC.validate()) {
                    logger.warning(error.elementID + " (" + error.source + "):  " + error.msg);
                }
            });
        });
    }

    initMenu() {
        const commands = new CommandRegistry();

        //  Dashboard  Commands  ---
        commands.addCommand("dash_add", {
            label: "Add View",
            execute: () => {
                const newElem = new Element(this._elementContainer);
                this._elementContainer.append(newElem);
                this.loadDashboard().then(() => {
                    newElem.refresh().then(() => {
                        this._dashboard.activate(newElem);
                    });
                });
            }
        });

        commands.addCommand("dash_clear", {
            label: "Clear",
            execute: () => {
                this.clear();
            }
        });

        commands.addCommand("dash_save", {
            label: "Save",
            execute: () => {
                const text = JSON.stringify(this.save(), null, "  ");
                Utility.downloadBlob("JSON", text, "dashy", "json");
            }
        });

        commands.addCommand("dash_load", {
            label: "Open",
            execute: () => {
                this._fileOpen.property("accept", ".json");
                this._fileOpen.node().click();
            }
        });

        //  Model Commands  ---
        const palette = new CommandPalette({ commands });
        palette.addItem({ command: "addWUResult", category: "Notebook" });
        palette.addItem({ command: "addView", category: "Notebook" });
        palette.addItem({ command: "remove", category: "Notebook" });
        palette.id = "palette";

        const contextMenu = new ContextMenu({ commands });

        contextMenu.addItem({ command: "dash_add", selector: `#${this._dashboard.id()}` });
        contextMenu.addItem({ command: "dash_clear", selector: `#${this._dashboard.id()}` });
        contextMenu.addItem({ type: "separator", selector: `#${this._dashboard.id()}` });

        contextMenu.addItem({ command: "dash_load", selector: `#${this.id()}` });
        contextMenu.addItem({ command: "dash_save", selector: `#${this.id()}` });

        document.addEventListener("contextmenu", (event: MouseEvent) => {
            if (contextMenu.open(event)) {
                event.preventDefault();
            }
        });
    }

    addDatabomb(label: string, payload: string, format: "csv" | "tsv" | "json") {
        const databomb = new Databomb().id(label).format(format).payload(payload);
        this._elementContainer.appendDatasource(databomb);
        const newElem = new Element(this._elementContainer);
        const ds = newElem.hipiePipeline().datasource();
        if (ds instanceof DSPicker) {
            ds.datasourceID(databomb.id());
        }
        this._elementContainer.append(newElem);
        this.loadDashboard().then(() => {
            newElem.refresh().then(() => {
                this._dashboard.activate(newElem);
            });
        });
    }

    enter(domNode, element) {
        super.enter(domNode, element);
        this
            .addWidget(this._tabLHS)
            .addWidget(this._tabRHS)
            ;
        this._tabLHS
            .addWidget(this._dashboard, "Dashboard")
            .addWidget(this._pipeline, "Pipeline")
            .addWidget(this._tabDDL, "DDL")
            .on("childActivation", (w: Widget) => {
                switch (w) {
                    case this._dashboard:
                        delete this._currActivity;
                        this._tabRHS.childActivation(this._tabRHS.active());
                        break;
                    case this._pipeline:
                        delete this._currActivity;
                        this.loadGraph(true);
                        break;
                    case this._tabDDL:
                        delete this._currActivity;
                        this._tabDDL.childActivation(this._tabDDL.active());
                        break;
                }
            })
            ;
        this._tabDDL
            .addWidget(this._ddlSchema, "Schema")
            .addWidget(this._ddlEditor, "v2")
            .addWidget(this._jsEditor, "TS")
            .addWidget(this._layoutEditor, "Layout")
            .on("childActivation", (w: Widget) => {
                switch (w) {
                    case this._ddlEditor:
                        this.loadDDL(true);
                        break;
                    case this._jsEditor:
                        this.loadJavaScript(true);
                        break;
                    case this._layoutEditor:
                        this.loadLayout(true);
                        break;
                }
            })
            ;
        this._tabRHS
            .addWidget(this._splitView, "Data View")
            .addWidget(this._widgetProperties, "Viz")
            .addWidget(this._paletteProperties, "Palette")
            .addWidget(this._stateProperties, "State")
            .addWidget(this._clone, "Clone")
            .on("childActivation", (w: Widget) => {
                switch (w) {
                    case this._splitView:
                        this.loadDataProps(this._currActivity || (this._currElement && this._currElement.hipiePipeline()));
                        this.loadPreview(this._currActivity || (this._currElement && this._currElement.hipiePipeline().last()));
                        break;
                    case this._widgetProperties:
                        this.loadWidgetProps(this._currElement && this._currElement.visualization());
                        break;
                    case this._paletteProperties:
                        break;
                    case this._stateProperties:
                        this.loadStateProps(this._currElement && this._currElement.state());
                        break;
                    case this._clone:
                        this.loadClone();
                        break;
                }
            })
            ;
        this._splitView
            .addWidget(this._viewProperties)
            .addWidget(this._viewPreview)
            ;

        this.initMenu();
        this._viewProperties.monitor((id: string, newValue: any, oldValue: any, source: PropertyExt) => {
            if (source !== this._viewProperties && this._currElement) {
                this._currElement.refresh().then(() => {
                    this.refreshPreview();
                });
                switch (this._tabLHS.active()) {
                    case this._dashboard:
                        break;
                    case this._pipeline:
                        setTimeout(() => {
                            this.loadGraph(true);
                        }, 500);
                        break;
                    case this._tabDDL:
                        switch (this._tabDDL.active()) {
                            case this._ddlEditor:
                                this.loadDDL(true);
                                break;
                            case this._layoutEditor:
                                this.loadLayout(true);
                                break;
                        }
                    case this._clone:
                        break;
                }
            }
        });
        this._widgetProperties.monitor((id: string, newValue: any, oldValue: any, source: PropertyExt) => {
            if (this._currElement) {
                if (id === "chartType") {
                    this._currElement.visualization().refreshMappings();
                }
                this._currElement.visualization().refreshData();
            }
        });
        const context = this;
        this._fileOpen = element.append("input")
            .attr("type", "file")
            .property("accept", ".json")
            .style("display", "none")
            .on("change", function () {
                let i = 0;
                let f = this.files[i];
                while (f) {
                    const reader = new FileReader();
                    reader.onload = (function (theFile) {
                        return function (e) {
                            try {
                                const json = JSON.parse(e.target.result);
                                context.importDDL(json);
                            } catch (ex) {
                                alert("ex when trying to parse json = " + ex);
                            }
                        };
                    })(f);
                    reader.readAsText(f);
                    f = this.files[++i];
                    break;
                }
            })
            ;

        this.loadPaletteProps(palettes);
    }

    update(domNode, element) {
        super.update(domNode, element);
    }
}
Dashy.prototype._class += " composite_Dashy";
