import { Layered, TopoJSONChoropleth, topoJsonFolder } from "@hpcc-js/map";

topoJsonFolder("https://unpkg.com/@hpcc-js/map@2.0.0/TopoJSON");

const gb = new TopoJSONChoropleth()   //  Great Brittan 
    .region("GB")
    ;

const nd = new TopoJSONChoropleth()   //  Northern Ireland
    .region("ND")
    ;

const ie = new TopoJSONChoropleth()   //  Republic of Ireland
    .region("IE")
    ;

new Layered()
    .target("target")
    .layers([
        gb,
        nd,
        ie,
    ])
    .render()
    ;

const eu_countries = ["AT", "BE", "BG", "CHLI", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GE", "GR", "HR", "HU", "IE", "IS", "IT", "KS", "LT", "LU", "LV", "MD", "MK", "MT", "ND", "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SK", "UA"];
