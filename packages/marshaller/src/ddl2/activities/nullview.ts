import { HipiePipeline } from "./hipiepipeline";

export class NullView extends HipiePipeline {
    hash(): string {
        return super.hash();
    }

    _fetch(from: number, count: number): Promise<any[]> {
        return Promise.resolve([]);
    }
}
NullView.prototype._class += " NullView";
