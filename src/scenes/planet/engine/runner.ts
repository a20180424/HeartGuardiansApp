import type { MissionData, MissionNode, RunnerView, Choice } from "./types";

export class DialogueRunner {
  private data: MissionData;
  private view: RunnerView;
  private nodes: Record<string, MissionNode> = {};
  private explored: Record<string, Set<number>> = {};
  current?: string;

  constructor(data: MissionData, view: RunnerView) {
    this.data = data;
    this.view = view;
    data.nodes.forEach((n) => {
      this.nodes[n.id] = n;
    });
  }

  private typeOf(n: MissionNode): "line" | "choice" | "branch" | "mirrors" | "gauge" | "reveal" {
    return n.type || (n.choices ? "choice" : "line");
  }

  start() {
    this.reset();
  }

  reset() {
    this.explored = {};
    this.view.reset();
    this.go(this.data.start);
  }

  private go(id: string | null | undefined) {
    if (id == null) {
      this.end();
      return;
    }
    this.current = id;
    const node = this.nodes[id];
    this.view.setDebug?.(node);
    this.view.execCommands(node.onEnter, node);

    const t = this.typeOf(node);
    if (t === "branch") {
      this.evalBranch(node);
      return;
    }
    if (t === "choice") {
      this.enterChoice(node);
      return;
    }
    if (t === "mirrors") {
      this.view.showMirrors(node, () => this.advance(node));
      return;
    }
    if (t === "gauge") {
      this.view.showGauge(node, () => this.advance(node));
      return;
    }
    if (t === "reveal") {
      this.view.showReveal(node, () => this.advance(node));
      return;
    }
    this.typeLine(node);
  }

  private typeLine(node: MissionNode) {
    this.view
      .showLine(node, () => this.view.execCommands(node.onComplete, node))
      .then(() => this.advance(node));
  }

  private advance(node: MissionNode) {
    if (node.next) this.go(node.next);
    else this.end();
  }

  private evalBranch(node: MissionNode) {
    let res = false;
    if (node.condition === "allExplored") {
      const set = this.explored[node.watch!];
      const tgt = this.nodes[node.watch!];
      const total = tgt && tgt.choices ? tgt.choices.length : 0;
      res = !!set && total > 0 && set.size >= total;
    }
    this.go(res ? node.ifTrue : node.ifFalse);
  }

  private enterChoice(node: MissionNode) {
    if (node.requireAll) {
      const set = this.explored[node.id] || (this.explored[node.id] = new Set());
      if (set.size >= node.choices!.length) {
        if (node.next) this.go(node.next);
        return;
      }
    }
    this.view.showChoices(node, this.explored[node.id] || null, (idx: number, choice: Choice) => {
      if (node.requireAll) {
        (this.explored[node.id] || (this.explored[node.id] = new Set())).add(idx);
      }
      this.go(choice.next);
    });
  }

  private end() {
    this.view.end();
  }
}
