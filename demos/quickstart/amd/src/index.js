var app;

require(["@hpcc-js/chart", "@hpcc-js/phosphor"], function (hpccChart, hpccPhosphor) {
    var examResults = {
        columns: ["Subject", "Year 1", "Year 2", "Year 3"],
        data: [
            ["Geography", 75, 68, 65],
            ["English", 45, 55, 52],
            ["Math", 98, 92, 90],
            ["Science", 66, 60, 72]
        ]
    };

    //  Bar Chart  ---
    const bar = new hpccChart.Bar()
        .columns(examResults.columns)
        .data(examResults.data)
        ;

    //  Pie Chart  ---
    const pie = new hpccChart.Pie()
        .columns(examResults.columns)
        .data(examResults.data)
        .paletteID("Paired")
        ;

    //  Line  ---
    const line = new hpccChart.Line()
        .columns(examResults.columns)
        .data(examResults.data)
        ;

    //  Hex Bin  ---
    const radar = new hpccChart.Radar()
        .columns(examResults.columns)
        .data(examResults.data)
        ;

    //  Dock Panel ---
    app = new hpccPhosphor.DockPanel()
        .target("placeholder")
        .addWidget(bar, "Bar")
        .addWidget(line, "Line", "split-right", bar)
        .addWidget(pie, "Pie", "split-bottom", bar)
        .addWidget(radar, "Radar", "tab-after", line)
        .render()
        ;
});

function doResize() {
    if (app) {
        app
            .resize()
            .render()
            ;
    }
}

