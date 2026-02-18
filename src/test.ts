import { NS } from "@ns";

export async function main(ns: NS) {
  ns.tprint(ns.getServerMaxRam("pserv-24"));
  ns.tprint(ns.getPurchasedServerMaxRam());
}
