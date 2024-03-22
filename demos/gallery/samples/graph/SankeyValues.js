import { Sankey, SankeyColumn } from "@hpcc-js/graph";

new Sankey()
    .target("target")
    .columns(["C1", "C2", "V"])
    .data([
        ["A", "Math", 48],
        ["B", "Math", 63],
        ["C", "Math", 42],
        ["D", "Math", 90],
        ["F", "Math", 10],
        ["A", "English", 28],
        ["B", "English", 39],
        ["C", "English", 36],
        ["D", "English", 59],
        ["F", "English", 3],
        ["A", "Geometry", 26],
        ["B", "Geometry", 36],
        ["C", "Geometry", 27],
        ["D", "Geometry", 15],
        ["F", "Geometry", 6],
        ["A", "Science", 38],
        ["B", "Science", 58],
        ["C", "Science", 68],
        ["D", "Science", 35],
        ["F", "Science", 4],
    ])
    .mappings([
        new SankeyColumn().aggrColumn("V").aggrType("sum").column("C1"),
        new SankeyColumn().aggrColumn("V").aggrType("sum").column("C2"),
        new SankeyColumn().aggrColumn("V").aggrType("sum").column("C1")
    ])
    .render()
    ;
